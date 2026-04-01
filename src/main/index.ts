import 'dotenv/config';
import { app, shell } from 'electron';
import Store from 'electron-store';

import { WindowManager } from './window-manager';
import { TrayManager } from './tray-manager';
import { AuthManager } from './auth/auth-manager';
import { getDatabase, pruneOldMessages } from './db/database';
import { TenantRepository } from './db/repositories/tenant-repo';
import { ChatRepository } from './db/repositories/chat-repo';
import { MessageRepository } from './db/repositories/message-repo';
import { TeamRepository } from './db/repositories/team-repo';
import { ChannelRepository } from './db/repositories/channel-repo';
import { PollScheduler } from './polling/poll-scheduler';
import { NotificationManager } from './notifications/notification-manager';
import { registerIpcHandlers } from './ipc/ipc-main-handler';
import { ChatsApi } from './graph/chats-api';
import { MessagesApi } from './graph/messages-api';
import { TeamsApi } from './graph/teams-api';
import { createGraphClient } from './graph/graph-client-factory';
import {
  detectChangedChats,
  detectChangedChannelMessages,
  shouldNotify,
  buildChatFromGraphResponse,
  buildMessageFromGraphResponse,
  buildChannelFromGraphResponse,
  buildMessageFromChannelResponse,
} from './polling/poll-worker';
import { DEFAULT_SETTINGS } from '../shared/types';
import { IPC } from '../shared/ipc-channels';
import { isUnread, teamsAppLink } from '../shared/deep-links';
import type { AppSettings } from '../shared/types';

// ── App single-instance lock ────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Prevent Dock appearance on macOS (pure tray app) — only in production ────
const isDev = !app.isPackaged;
if (!isDev && process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

// ── Store for settings and transient state ────────────────────────────────────
interface StoreSchema {
  settings: AppSettings;
  lastPolledAt: Record<string, string>;
}

const store = new Store<StoreSchema>({
  defaults: {
    settings: DEFAULT_SETTINGS,
    lastPolledAt: {},
  },
});

// ── Module instances ──────────────────────────────────────────────────────────
const windowManager = new WindowManager();
const notificationManager = new NotificationManager();
let trayManager: TrayManager;

const clientId = process.env.AZURE_CLIENT_ID ?? '21b3a2a7-f91d-4951-a576-d8c55272a3d9';
const authManager = new AuthManager(clientId);

// ── Database ──────────────────────────────────────────────────────────────────
const db = getDatabase(app.getPath('userData'));
const tenantRepo = new TenantRepository(db);
const chatRepo = new ChatRepository(db);
const messageRepo = new MessageRepository(db);
const teamRepo = new TeamRepository(db);
const channelRepo = new ChannelRepository(db);

// ── Poll function ─────────────────────────────────────────────────────────────
async function pollTenant(tenantId: string): Promise<void> {
  const tenant = tenantRepo.findById(tenantId);
  if (!tenant) return;

  windowManager.sendToRenderer(IPC.PUSH_SYNC_STATUS, {
    tenantId,
    status: 'syncing',
  });

  try {
    const token = await authManager.getAccessTokenForTenant(tenantId);
    const graphClient = createGraphClient(() => Promise.resolve(token));
    const chatsApi = new ChatsApi(graphClient);
    const messagesApi = new MessagesApi(graphClient);
    const teamsApi = new TeamsApi(graphClient);

    // Phase 1: fetch chat list
    const graphChats = await chatsApi.listChats();
    const storedChats = chatRepo.findByTenant(tenantId, { includeHidden: true });
    const settings = store.get('settings');

    // Phase 2: detect changed chats
    const changedGraphChats = detectChangedChats(graphChats, storedChats);

    // Upsert all chats
    const now = new Date().toISOString();
    for (const graphChat of graphChats) {
      const chat = buildChatFromGraphResponse(graphChat, tenantId);
      chatRepo.upsert(chat);
    }

    // Phase 3: fetch messages for changed chats
    const lastPolledMap = store.get('lastPolledAt') as Record<string, string>;
    const firstRunCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago

    for (const graphChat of changedGraphChats) {
      const chatLastPolled =
        lastPolledMap[`${tenantId}:${graphChat.id}`] ?? firstRunCutoff;

      try {
        const messages = await messagesApi.listMessages(graphChat.id, chatLastPolled);
        for (const rawMsg of messages) {
          if (rawMsg.messageType !== 'message') continue;

          const message = buildMessageFromGraphResponse(rawMsg, graphChat.id, tenantId);
          const alreadyNotified = messageRepo.isNotified(message.id, tenantId);

          messageRepo.upsert(message);

          if (shouldNotify(rawMsg, tenant.userId, alreadyNotified)) {
            const chat = chatRepo.findById(graphChat.id, tenantId);
            if (chat) {
              notificationManager.notify(message, chat, tenant, () => {
                if (chat.webUrl) {
                  shell.openExternal(teamsAppLink(chat.webUrl));
                }
              });
              messageRepo.markNotified(message.id, tenantId);
            }
          }
        }
      } catch (err) {
        // Per-chat errors don't abort the full poll
        console.warn(`[poll] Failed to fetch messages for chat ${graphChat.id}:`, err);
      }

      // Update last polled timestamp for this chat
      lastPolledMap[`${tenantId}:${graphChat.id}`] = now;
    }

    // ── Phase 4: Poll channel threads across all joined teams ────────────
    try {
      const graphTeams = await teamsApi.listJoinedTeams();

      for (const graphTeam of graphTeams) {
        // Upsert team
        teamRepo.upsert({
          id: graphTeam.id,
          displayName: graphTeam.displayName ?? '',
          tenantId,
        });

        let channels;
        try {
          channels = await teamsApi.listChannels(graphTeam.id);
        } catch (err) {
          console.warn(`[poll] Failed to list channels for team ${graphTeam.id}:`, err);
          continue;
        }

        for (const graphChannel of channels) {
          // Upsert channel
          const channel = buildChannelFromGraphResponse(graphChannel, graphTeam.id, tenantId);
          channelRepo.upsert(channel);

          const channelKey = `${tenantId}:team:${graphTeam.id}:ch:${graphChannel.id}`;
          const channelLastPolled = lastPolledMap[channelKey] ?? firstRunCutoff;

          try {
            // Fetch root channel messages
            const channelMessages = await teamsApi.listChannelMessages(
              graphTeam.id,
              graphChannel.id,
              channelLastPolled,
            );

            const newMessages = detectChangedChannelMessages(channelMessages, channelLastPolled);

            for (const rawMsg of newMessages) {
              const message = buildMessageFromChannelResponse(
                rawMsg,
                graphChannel.id,
                graphTeam.id,
                tenantId,
              );
              const alreadyNotified = messageRepo.isNotified(message.id, tenantId);
              messageRepo.upsert(message);

              if (shouldNotify(rawMsg, tenant.userId, alreadyNotified)) {
                const teamName = graphTeam.displayName ?? 'Team';
                const channelName = graphChannel.displayName ?? 'Channel';
                notificationManager.notify(
                  message,
                  {
                    id: graphChannel.id,
                    tenantId,
                    chatType: 'group',
                    topic: `${teamName} › ${channelName}`,
                    memberNames: [],
                    lastMessagePreviewText: message.bodyContent,
                    lastMessagePreviewSender: message.senderDisplayName,
                    lastMessageAt: message.createdAt,
                    lastReadAt: null,
                    isHidden: false,
                    webUrl: graphChannel.webUrl ?? null,
                    lastPolledAt: null,
                    updatedAt: now,
                  },
                  tenant,
                  () => {
                    if (graphChannel.webUrl) {
                      shell.openExternal(graphChannel.webUrl);
                    }
                  },
                );
                messageRepo.markNotified(message.id, tenantId);
              }

              // Also fetch replies for this thread root message
              try {
                const replies = await teamsApi.listMessageReplies(
                  graphTeam.id,
                  graphChannel.id,
                  rawMsg.id,
                  channelLastPolled,
                );

                for (const rawReply of replies) {
                  if (rawReply.messageType !== 'message') continue;
                  const reply = buildMessageFromChannelResponse(
                    rawReply,
                    graphChannel.id,
                    graphTeam.id,
                    tenantId,
                  );
                  const replyNotified = messageRepo.isNotified(reply.id, tenantId);
                  messageRepo.upsert(reply);

                  if (shouldNotify(rawReply, tenant.userId, replyNotified)) {
                    const teamName = graphTeam.displayName ?? 'Team';
                    const channelName = graphChannel.displayName ?? 'Channel';
                    notificationManager.notify(
                      reply,
                      {
                        id: graphChannel.id,
                        tenantId,
                        chatType: 'group',
                        topic: `${teamName} › ${channelName} (thread)`,
                        memberNames: [],
                        lastMessagePreviewText: reply.bodyContent,
                        lastMessagePreviewSender: reply.senderDisplayName,
                        lastMessageAt: reply.createdAt,
                        lastReadAt: null,
                        isHidden: false,
                        webUrl: graphChannel.webUrl ?? null,
                        lastPolledAt: null,
                        updatedAt: now,
                      },
                      tenant,
                      () => {
                        if (graphChannel.webUrl) {
                          shell.openExternal(graphChannel.webUrl);
                        }
                      },
                    );
                    messageRepo.markNotified(reply.id, tenantId);
                  }
                }
              } catch (err) {
                // Reply fetch errors don't abort this thread
                console.warn(`[poll] Failed to fetch replies for message ${rawMsg.id}:`, err);
              }
            }
          } catch (err) {
            console.warn(
              `[poll] Failed to fetch channel messages for ${graphTeam.id}/${graphChannel.id}:`,
              err,
            );
          }

          // Update last polled timestamp for this channel
          lastPolledMap[channelKey] = now;
        }
      }
    } catch (err) {
      // Team/channel polling failure doesn't abort the whole poll cycle
      console.warn(`[poll] Failed to poll teams/channels for tenant ${tenantId}:`, err);
    }

    // Persist updated timestamps
    store.set('lastPolledAt', lastPolledMap);
    tenantRepo.updateLastSynced(tenantId, now);

    // Notify renderer
    const updatedChats = chatRepo.findByTenant(tenantId, {
      includeHidden: settings?.showHiddenChats ?? false,
    });
    windowManager.sendToRenderer(IPC.PUSH_CHATS_UPDATED, {
      tenantId,
      chats: updatedChats,
    });

    const ageCutoffIso = settings.chatMaxAgeDays > 0
      ? new Date(Date.now() - settings.chatMaxAgeDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const unreadCount = updatedChats.filter(c =>
      (!ageCutoffIso || !c.lastMessageAt || c.lastMessageAt >= ageCutoffIso) && isUnread(c)
    ).length;
    trayManager?.updateUnreadCount(tenantId, unreadCount);

    windowManager.sendToRenderer(IPC.PUSH_SYNC_STATUS, { tenantId, status: 'idle' });

  } catch (err) {
    console.error(`[poll] Error for tenant ${tenantId}:`, err);

    // Detect consent/interaction-required errors — stop polling and prompt re-auth
    const isConsentRequired =
      err instanceof Error &&
      ('errorCode' in err || 'subError' in err) &&
      (String((err as Record<string, unknown>).subError) === 'consent_required' ||
       String((err as Record<string, unknown>).errorCode) === 'interaction_required' ||
       String((err as Record<string, unknown>).errorCode) === 'invalid_grant');

    if (isConsentRequired) {
      console.warn(`[poll] Consent required for tenant ${tenantId} — stopping poll, re-auth needed`);
      scheduler.stop(tenantId);
    }

    windowManager.sendToRenderer(IPC.PUSH_SYNC_STATUS, {
      tenantId,
      status: 'error',
      errorMessage: isConsentRequired
        ? 'New permissions required. Please sign out and sign back in.'
        : (err instanceof Error ? err.message : String(err)),
    });
    windowManager.sendToRenderer(IPC.PUSH_TENANT_AUTH_STATE, {
      tenantId,
      status: 'error',
      errorMessage: isConsentRequired
        ? 'New permissions required. Please sign out and sign back in.'
        : (err instanceof Error ? err.message : String(err)),
    });
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
const settings = store.get('settings');
const scheduler = new PollScheduler(pollTenant, settings.pollIntervalSeconds);

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Prune old messages once per launch
  pruneOldMessages(db);

  // Apply settings
  notificationManager.setEnabled(settings.notificationsEnabled);
  notificationManager.setShowPreview(settings.showMessagePreviewInNotification);

  if (settings.launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  }

  // Create window and tray
  windowManager.create();
  trayManager = new TrayManager(
    () => windowManager.toggle(),
    () => {
      scheduler.stopAll();
      app.exit(0);
    },
  );
  trayManager.create();

  // Register IPC handlers
  registerIpcHandlers(
    authManager,
    tenantRepo,
    chatRepo,
    scheduler,
    windowManager,
    store as Store<StoreSchema>,
  );

  // Load persisted tenants and start polling
  const tenants = tenantRepo.findAll();
  for (const tenant of tenants) {
    authManager.registerTenant(tenant.id);
    scheduler.start(tenant.id);
  }

  app.on('second-instance', () => {
    windowManager.show();
  });

  app.on('activate', () => {
    windowManager.show();
  });
});

app.on('window-all-closed', () => {
  // Stay running in tray — do not quit
});

app.on('before-quit', () => {
  scheduler.stopAll();
});
