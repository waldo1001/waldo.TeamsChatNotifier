import { IPC } from '@shared/ipc-channels';
import type {
  Tenant,
  Chat,
  AppSettings,
  TenantAuthState,
  DeviceCodeInfo,
  SyncStatus,
} from '@shared/types';

const { invoke, on } = window.electronAPI;

// ── Typed invoke wrappers ────────────────────────────────────────────────────

export const ipc = {
  auth: {
    startDeviceCode: (loginHint?: string) =>
      invoke(IPC.AUTH_START_DEVICE_CODE, { loginHint }) as Promise<Tenant>,
    cancelDeviceCode: () =>
      invoke(IPC.AUTH_CANCEL_DEVICE_CODE) as Promise<void>,
    signOutTenant: (tenantId: string) =>
      invoke(IPC.AUTH_SIGN_OUT_TENANT, { tenantId }) as Promise<{ success: boolean }>,
  },
  chats: {
    getAll: () =>
      invoke(IPC.CHATS_GET_ALL) as Promise<{ tenants: Tenant[]; chatsByTenant: Record<string, Chat[]> }>,
    openInTeams: (webUrl: string, chatId?: string, tenantId?: string) =>
      invoke(IPC.CHATS_OPEN_IN_TEAMS, { webUrl, chatId, tenantId }) as Promise<void>,
    markRead: (chatId: string, tenantId: string) =>
      invoke(IPC.CHATS_MARK_READ, { chatId, tenantId }) as Promise<{ success: boolean }>,
    forcePoll: (tenantId: string) =>
      invoke(IPC.CHATS_FORCE_POLL, { tenantId }) as Promise<void>,
    resyncTenant: (tenantId: string) =>
      invoke(IPC.CHATS_RESYNC_TENANT, { tenantId }) as Promise<{ success: boolean }>,
  },
  settings: {
    get: () =>
      invoke(IPC.SETTINGS_GET) as Promise<AppSettings>,
    set: (partial: Partial<AppSettings>) =>
      invoke(IPC.SETTINGS_SET, partial) as Promise<AppSettings>,
  },
  tenants: {
    getAll: () =>
      invoke(IPC.TENANTS_GET_ALL) as Promise<Tenant[]>,
  },
  app: {
    getVersion: () =>
      invoke(IPC.APP_GET_VERSION) as Promise<{ version: string; platform: string }>,
  },
};

// ── Push event subscriptions ─────────────────────────────────────────────────

export function onChatsUpdated(cb: (payload: { tenantId: string; chats: Chat[] }) => void) {
  return on(IPC.PUSH_CHATS_UPDATED, cb as (...args: unknown[]) => void);
}

export function onNewMessage(cb: (payload: unknown) => void) {
  return on(IPC.PUSH_NEW_MESSAGE, cb as (...args: unknown[]) => void);
}

export function onTenantAuthState(cb: (state: TenantAuthState) => void) {
  return on(IPC.PUSH_TENANT_AUTH_STATE, cb as (...args: unknown[]) => void);
}

export function onDeviceCodeReady(cb: (info: DeviceCodeInfo) => void) {
  return on(IPC.PUSH_DEVICE_CODE_READY, cb as (...args: unknown[]) => void);
}

export function onSyncStatus(cb: (status: SyncStatus) => void) {
  return on(IPC.PUSH_SYNC_STATUS, cb as (...args: unknown[]) => void);
}
