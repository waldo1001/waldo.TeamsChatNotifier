import { ipcMain, shell } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { DEFAULT_SETTINGS } from '../../shared/types';
import type { AppSettings } from '../../shared/types';
import type { AuthManager } from '../auth/auth-manager';
import type { TenantRepository } from '../db/repositories/tenant-repo';
import type { ChatRepository } from '../db/repositories/chat-repo';
import type { PollScheduler } from '../polling/poll-scheduler';
import type { WindowManager } from '../window-manager';
import Store from 'electron-store';
import { createGraphClient } from '../graph/graph-client-factory';
import { ChatsApi } from '../graph/chats-api';

interface StoreSchema {
  settings: AppSettings;
  lastPolledAt: Record<string, string>;
}

export function registerIpcHandlers(
  authManager: AuthManager,
  tenantRepo: TenantRepository,
  chatRepo: ChatRepository,
  scheduler: PollScheduler,
  windowManager: WindowManager,
  store: Store<StoreSchema>,
): void {

  // ── Auth handlers ────────────────────────────────────────────────────────

  ipcMain.handle(IPC.AUTH_START_DEVICE_CODE, async (_event, payload: { loginHint?: string }) => {
    try {
      console.log('[auth] Starting device code flow…');
      const { tenantId, accessToken } = await authManager.startDeviceCodeFlow(
        (deviceCodeResponse) => {
          windowManager.sendToRenderer(IPC.PUSH_DEVICE_CODE_READY, {
            userCode: deviceCodeResponse.userCode,
            verificationUri: deviceCodeResponse.verificationUri,
            expiresIn: deviceCodeResponse.expiresIn,
            message: deviceCodeResponse.message,
          });
        },
        payload?.loginHint,
      );

      console.log('[auth] Device code flow completed, tenantId:', tenantId);

      // Fetch user profile from Graph using the token we already have
      console.log('[auth] Fetching user profile from Graph…');
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Graph /me failed (${res.status}): ${body}`);
      }

      const profile = await res.json() as { id: string; displayName: string; userPrincipalName: string };
      console.log('[auth] Got profile:', profile.displayName, profile.userPrincipalName);

      const tenant = {
        id: tenantId,
        displayName: profile.displayName ?? 'Unknown',
        userPrincipalName: profile.userPrincipalName,
        userId: profile.id,
        addedAt: new Date().toISOString(),
        lastSyncedAt: null,
      };

      tenantRepo.upsert(tenant);
      authManager.registerTenant(tenantId);
      scheduler.start(tenantId);

      windowManager.sendToRenderer(IPC.PUSH_TENANT_AUTH_STATE, {
        tenantId,
        status: 'signed-in',
      });

      console.log('[auth] Tenant registered and polling started:', tenantId);
      return tenant;
    } catch (err) {
      console.error('[auth] Device code flow error:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC.AUTH_CANCEL_DEVICE_CODE, async () => {
    authManager.cancelDeviceCodeFlow();
  });

  ipcMain.handle(IPC.AUTH_SIGN_OUT_TENANT, async (_event, payload: { tenantId: string }) => {
    scheduler.stop(payload.tenantId);
    await authManager.unregisterTenant(payload.tenantId);
    tenantRepo.delete(payload.tenantId);
    windowManager.sendToRenderer(IPC.PUSH_TENANT_AUTH_STATE, {
      tenantId: payload.tenantId,
      status: 'signing-out',
    });
    return { success: true };
  });

  // ── Chat handlers ────────────────────────────────────────────────────────

  ipcMain.handle(IPC.CHATS_GET_ALL, async () => {
    const tenants = tenantRepo.findAll();
    const chatsByTenant: Record<string, ReturnType<typeof chatRepo.findByTenant>> = {};
    const settings = store.get('settings');
    for (const tenant of tenants) {
      chatsByTenant[tenant.id] = chatRepo.findByTenant(tenant.id, {
        includeHidden: settings?.showHiddenChats ?? false,
      });
    }
    return { tenants, chatsByTenant };
  });

  ipcMain.handle(IPC.CHATS_OPEN_IN_TEAMS, async (_event, payload: { webUrl: string; chatId?: string; tenantId?: string }) => {
    if (payload?.webUrl) {
      await shell.openExternal(payload.webUrl);
    }
    // Mark chat as read when opened
    if (payload?.chatId && payload?.tenantId) {
      chatRepo.markRead(payload.chatId, payload.tenantId, new Date().toISOString());
    }
  });

  ipcMain.handle(IPC.CHATS_MARK_READ, async (_event, payload: { chatId: string; tenantId: string }) => {
    if (!payload?.chatId || !payload?.tenantId) return { success: false };
    try {
      const tenant = tenantRepo.findById(payload.tenantId);
      if (!tenant) return { success: false };
      const token = await authManager.getAccessTokenForTenant(payload.tenantId);
      const graphClient = createGraphClient(() => Promise.resolve(token));
      const chatsApi = new ChatsApi(graphClient);
      await chatsApi.markAsRead(payload.chatId, tenant.userId, payload.tenantId);
      chatRepo.markRead(payload.chatId, payload.tenantId, new Date().toISOString());
      return { success: true };
    } catch (err) {
      console.error('[chats] markAsRead failed:', err);
      return { success: false };
    }
  });

  ipcMain.handle(IPC.CHATS_FORCE_POLL, async (_event, payload: { tenantId: string }) => {
    scheduler.forceImmediatePoll(payload.tenantId);
  });

  ipcMain.handle(IPC.CHATS_RESYNC_TENANT, async (_event, payload: { tenantId: string }) => {
    // Wipe all chats for this tenant (messages cascade via FK)
    chatRepo.deleteByTenant(payload.tenantId);
    // Clear lastPolledAt timestamps for this tenant so the next poll fetches fresh
    const lastPolledMap = store.get('lastPolledAt');
    const cleaned = Object.fromEntries(
      Object.entries(lastPolledMap).filter(([k]) => !k.startsWith(`${payload.tenantId}:`)),
    );
    store.set('lastPolledAt', cleaned);
    // Push empty chat list to renderer immediately
    windowManager.sendToRenderer(IPC.PUSH_CHATS_UPDATED, { tenantId: payload.tenantId, chats: [] });
    // Kick off a fresh poll
    scheduler.forceImmediatePoll(payload.tenantId);
    return { success: true };
  });

  // ── Settings handlers ────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return { ...DEFAULT_SETTINGS, ...store.get('settings') };
  });

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, partial: Partial<AppSettings>) => {
    const current = { ...DEFAULT_SETTINGS, ...store.get('settings') };
    const updated = { ...current, ...partial };
    store.set('settings', updated);

    if (partial.pollIntervalSeconds !== undefined) {
      scheduler.updateInterval(partial.pollIntervalSeconds);
    }

    return updated;
  });

  // ── Tenant handlers ───────────────────────────────────────────────────────

  ipcMain.handle(IPC.TENANTS_GET_ALL, async () => {
    return tenantRepo.findAll();
  });

  // ── App handlers ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC.APP_GET_VERSION, async () => {
    const { app: electronApp } = await import('electron');
    return { version: electronApp.getVersion(), platform: process.platform };
  });
}
