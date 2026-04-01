// Single source of truth for all IPC channel names.
// Never use raw string literals for channel names outside this file.

export const IPC = {
  // ── Renderer → Main (ipcRenderer.invoke / ipcMain.handle) ──────────────
  AUTH_START_DEVICE_CODE:   'auth:start-device-code',
  AUTH_CANCEL_DEVICE_CODE:  'auth:cancel-device-code',
  AUTH_SIGN_OUT_TENANT:     'auth:sign-out-tenant',

  CHATS_GET_ALL:            'chats:get-all',
  CHATS_OPEN_IN_TEAMS:      'chats:open-in-teams',
  CHATS_MARK_READ:          'chats:mark-read',
  CHATS_FORCE_POLL:         'chats:force-poll',
  CHATS_RESYNC_TENANT:      'chats:resync-tenant',

  SETTINGS_GET:             'settings:get',
  SETTINGS_SET:             'settings:set',

  TENANTS_GET_ALL:          'tenants:get-all',

  APP_GET_VERSION:          'app:get-version',

  // ── Main → Renderer (webContents.send / ipcRenderer.on) ────────────────
  PUSH_CHATS_UPDATED:       'push:chats-updated',
  PUSH_NEW_MESSAGE:         'push:new-message',
  PUSH_TENANT_AUTH_STATE:   'push:tenant-auth-state',
  PUSH_DEVICE_CODE_READY:   'push:device-code-ready',
  PUSH_SYNC_STATUS:         'push:sync-status',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
