# IPC Channels Reference

All IPC communication uses Electron's `ipcMain.handle` / `ipcRenderer.invoke` (request/response) and `webContents.send` / `ipcRenderer.on` (push from main). Channels are defined in `src/shared/ipc-channels.ts`.

## Renderer → Main (invoke)

| Channel | Constant | Payload | Returns | Description |
|---------|----------|---------|---------|-------------|
| `auth:start-device-code` | `IPC.AUTH_START_DEVICE_CODE` | `{ loginHint?: string }` | `Tenant` | Starts MSAL device code flow, pushes `PUSH_DEVICE_CODE_READY`, returns the new tenant on success |
| `auth:cancel-device-code` | `IPC.AUTH_CANCEL_DEVICE_CODE` | — | `void` | Cancels in-progress device code flow |
| `auth:sign-out-tenant` | `IPC.AUTH_SIGN_OUT_TENANT` | `{ tenantId: string }` | `{ success: boolean }` | Signs out a tenant, stops polling, deletes cache |
| `chats:get-all` | `IPC.CHATS_GET_ALL` | — | `{ tenants: Tenant[]; chatsByTenant: Record<string, Chat[]> }` | Returns all tenants and their chats |
| `chats:open-in-teams` | `IPC.CHATS_OPEN_IN_TEAMS` | `{ webUrl: string; chatId?: string; tenantId?: string }` | `void` | Opens chat URL in external browser, marks chat as read |
| `chats:force-poll` | `IPC.CHATS_FORCE_POLL` | `{ tenantId: string }` | `void` | Triggers an immediate poll for the tenant |
| `settings:get` | `IPC.SETTINGS_GET` | — | `AppSettings` | Returns current settings |
| `settings:set` | `IPC.SETTINGS_SET` | `Partial<AppSettings>` | `AppSettings` | Merges partial settings, returns updated full settings |
| `tenants:get-all` | `IPC.TENANTS_GET_ALL` | — | `Tenant[]` | Returns all registered tenants |
| `app:get-version` | `IPC.APP_GET_VERSION` | — | `{ version: string; platform: string }` | Returns app version and platform |

## Main → Renderer (push)

| Channel | Constant | Payload | Description |
|---------|----------|---------|-------------|
| `push:chats-updated` | `IPC.PUSH_CHATS_UPDATED` | `{ tenantId: string; chats: Chat[] }` | Sent after a successful poll with updated chat list |
| `push:new-message` | `IPC.PUSH_NEW_MESSAGE` | `unknown` | Reserved for future per-message push events |
| `push:tenant-auth-state` | `IPC.PUSH_TENANT_AUTH_STATE` | `TenantAuthState` | Auth status change (`signed-in`, `error`, `signing-out`) |
| `push:device-code-ready` | `IPC.PUSH_DEVICE_CODE_READY` | `DeviceCodeInfo` | Device code + verification URL ready for user |
| `push:sync-status` | `IPC.PUSH_SYNC_STATUS` | `SyncStatus` | Poll status per tenant (`syncing`, `idle`, `error`) |

## Preload Bridge

The preload script (`src/preload/preload.ts`) exposes two methods on `window.electronAPI`:

```typescript
window.electronAPI.invoke(channel: string, payload?: unknown): Promise<unknown>
window.electronAPI.on(channel: string, callback: (...args: unknown[]) => void): () => void
```

The `on` method returns an unsubscribe function for cleanup.

## Renderer IPC Client

The typed client in `src/renderer/api/ipc-client.ts` wraps these raw calls:

```typescript
ipc.auth.startDeviceCode(loginHint?)
ipc.auth.cancelDeviceCode()
ipc.auth.signOutTenant(tenantId)
ipc.chats.getAll()
ipc.chats.openInTeams(webUrl, chatId?, tenantId?)
ipc.chats.forcePoll(tenantId)
ipc.settings.get()
ipc.settings.set(partial)
ipc.tenants.getAll()
ipc.app.getVersion()
```

Push event listeners:

```typescript
onChatsUpdated(cb)    // returns unsubscribe fn
onNewMessage(cb)      // returns unsubscribe fn
onTenantAuthState(cb) // returns unsubscribe fn
onDeviceCodeReady(cb) // returns unsubscribe fn
onSyncStatus(cb)      // returns unsubscribe fn
```
