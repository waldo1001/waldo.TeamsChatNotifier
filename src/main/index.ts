import 'dotenv/config';
import { app, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';

import { WindowManager } from './window-manager';
import { TrayManager } from './tray-manager';
import { AuthManager } from './auth/auth-manager';
import { getDatabase, pruneOldMessages } from './db/database';
import { TenantRepository } from './db/repositories/tenant-repo';
import { ChatRepository } from './db/repositories/chat-repo';
import { MessageRepository } from './db/repositories/message-repo';
import { PollScheduler } from './polling/poll-scheduler';
import { NotificationManager } from './notifications/notification-manager';
import { registerIpcHandlers } from './ipc/ipc-main-handler';
import { ChatsApi } from './graph/chats-api';
import { MessagesApi } from './graph/messages-api';
import { createGraphClient } from './graph/graph-client-factory';
import {
  detectChangedChats,
  shouldNotify,
  buildChatFromGraphResponse,
  buildMessageFromGraphResponse,
} from './polling/poll-worker';
import { DEFAULT_SETTINGS } from '../shared/types';
import { IPC } from '../shared/ipc-channels';
import { teamsAppLink } from '../shared/deep-links';
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

const clientId = process.env.AZURE_CLIENT_ID ?? '';
const authManager = new AuthManager(clientId);

// ── Database ──────────────────────────────────────────────────────────────────
const db = getDatabase(app.getPath('userData'));
const tenantRepo = new TenantRepository(db);
const chatRepo = new ChatRepository(db);
const messageRepo = new MessageRepository(db);

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

    let unreadCount = 0;

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
              unreadCount++;
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

    windowManager.sendToRenderer(IPC.PUSH_SYNC_STATUS, { tenantId, status: 'idle' });

  } catch (err) {
    console.error(`[poll] Error for tenant ${tenantId}:`, err);
    windowManager.sendToRenderer(IPC.PUSH_SYNC_STATUS, {
      tenantId,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    windowManager.sendToRenderer(IPC.PUSH_TENANT_AUTH_STATE, {
      tenantId,
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
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
  const trayManager = new TrayManager(
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
