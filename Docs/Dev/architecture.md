# Architecture

## Overview

Teams Chat Notifier is a **tray-resident** Electron app that polls Microsoft Teams via the Graph API and shows native desktop notifications for new messages. It supports multiple Microsoft 365 tenants simultaneously.

```
┌──────────────────────────────────────────────────────┐
│                   Electron Main Process              │
│                                                      │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ AuthMgr  │  │ PollScheduler│  │ NotificationMgr│  │
│  │ (MSAL)   │  │  (per tenant)│  │  (native)      │  │
│  └────┬─────┘  └──────┬──────┘  └───────┬────────┘  │
│       │               │                 │            │
│  ┌────▼─────┐  ┌──────▼──────┐          │            │
│  │TokenCache│  │  PollWorker │──────────┘            │
│  │(encrypted)│ │ (Graph API) │                       │
│  └──────────┘  └──────┬──────┘                       │
│                       │                              │
│  ┌────────────────────▼──────────────────────────┐   │
│  │              SQLite (better-sqlite3)           │   │
│  │  tenants │ chats │ messages │ schema_migrations│   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ TrayManager  │  │ WindowManager│                  │
│  │ (menu+badge) │  │ (hide/show)  │                  │
│  └──────────────┘  └──────┬───────┘                  │
│                           │ IPC (contextBridge)      │
├───────────────────────────┼──────────────────────────┤
│  Preload                  │                          │
│  contextBridge.           │                          │
│  exposeInMainWorld()      │                          │
├───────────────────────────┼──────────────────────────┤
│                   Renderer Process                   │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐        │
│  │ Zustand  │  │ useChats │  │  ipc-client  │        │
│  │ AppStore │◀─│  hook    │◀─│  (typed API) │        │
│  └────┬────┘  └──────────┘  └──────────────┘        │
│       │                                              │
│  ┌────▼──────────────────────────────────────┐       │
│  │  React UI                                 │       │
│  │  ChatsPage ─ TenantSection ─ ChatListItem │       │
│  │  SettingsPage ─ DeviceCodeModal           │       │
│  └───────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

## Process Model

| Process | Role | Key Modules |
|---------|------|-------------|
| **Main** | Back-end logic, polling, auth, DB, notifications | `src/main/` |
| **Preload** | Bridges main ↔ renderer via `contextBridge` | `src/preload/preload.ts` |
| **Renderer** | React UI rendered by Vite | `src/renderer/` |

Security settings for the renderer:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: false` (required for preload script)

## Authentication Flow

1. User clicks **Add Account** in the UI.
2. Renderer calls `ipc.auth.startDeviceCode()`.
3. Main process creates a temporary `PublicClientApplication` with authority `https://login.microsoftonline.com/organizations`.
4. MSAL triggers the **device code flow** — returns a `userCode` + `verificationUri`.
5. Main pushes `PUSH_DEVICE_CODE_READY` to renderer, which shows the `DeviceCodeModal`.
6. User enters the code in a browser and authenticates.
7. On success, main extracts `tenantId` from the token, fetches `/me` from Graph to get the user profile, creates a tenant-scoped PCA (`/login.microsoftonline.com/{tenantId}`), and persists the token cache **encrypted** via `electron.safeStorage`.
8. Tenant is stored in SQLite and polling starts immediately.

**Scopes requested**: `Chat.ReadBasic`, `Chat.Read`, `User.Read`, `offline_access`.

### Token Cache Security

- Cache files live in `{userData}/token-caches/{tenantId}.cache`.
- Encrypted with `electron.safeStorage` (OS keychain-backed).
- If encryption is unavailable, tokens are not persisted.

## Polling Cycle

The `PollScheduler` runs an interval timer **per tenant** (default: 30 seconds).

Each poll cycle:

1. **Fetch chat list** — `GET /me/chats?$expand=lastMessagePreview,members` (up to 3 pages, 50 chats per page).
2. **Detect changes** — Compare `lastMessagePreview.createdDateTime` from Graph against `lastMessageAt` in the local DB. Only chats with newer messages are "changed".
3. **Upsert all chats** — Every fetched chat is written to the `chats` table.
4. **Fetch messages for changed chats** — `GET /chats/{id}/messages?$filter=lastModifiedDateTime gt {sinceIso}` (top 20).
5. **Notification decision** — A message triggers a notification if:
   - It's a regular message (`messageType === 'message'`).
   - It was **not** sent by the current user.
   - It has **not** already been notified (`notified` column in DB).
6. **Update bookmarks** — `lastPolledAt` per chat is stored in `electron-store`.

## Notification System

`NotificationManager` wraps Electron's `Notification` API:

- Controlled by the `notificationsEnabled` setting (on/off).
- Message body preview is shown unless `showMessagePreviewInNotification` is off.
- Clicking a notification opens the chat in the Teams desktop app via the `msteams://` protocol.

## Tray Behaviour

- **macOS**: `LSUIElement: true` hides the Dock icon in production. The tray icon shows an unread count on the title. `dock.bounce('informational')` is called for new messages.
- **Windows**: Standard system tray with context menu.
- **Close → Hide**: Closing the window hides it; the app keeps running in the tray.
- **Context menu**: Open | Quit.

## Window Manager

- Dimensions: 420 × 680 (min 360 × 500).
- macOS uses `hiddenInset` title bar style.
- In dev mode loads `http://localhost:5173`; in production loads the built `index.html`.
- External links open in the default browser.

## Deep Links

| Function | Output |
|----------|--------|
| `teamsAppLink(webUrl)` | Converts `https://teams.microsoft.com/…` → `msteams://teams.microsoft.com/…` |
| `chatDeepLink(chatId, tenantId)` | `https://teams.microsoft.com/l/chat/{chatId}/0?tenantId={tenantId}` |
| `messageDeepLink(chatId, messageId, tenantId)` | `https://teams.microsoft.com/l/message/{chatId}/{messageId}?context=…&tenantId=…` |

## State Management (Renderer)

The renderer uses **Zustand** (`useAppStore`) with the following state shape:

| Key | Type | Purpose |
|-----|------|---------|
| `tenants` | `Tenant[]` | All registered tenants |
| `chatsByTenant` | `Record<string, Chat[]>` | Chats indexed by tenant ID |
| `settings` | `AppSettings` | Current app settings |
| `authStates` | `Record<string, TenantAuthState>` | Per-tenant auth status |
| `deviceCodeInfo` | `DeviceCodeInfo \| null` | Active device code flow info |
| `syncingTenants` | `Set<string>` | Tenants currently syncing |
| `errorTenants` | `Record<string, string>` | Tenants with sync errors |

The `useChats` hook bootstraps the store on mount and subscribes to IPC push events.

## Build & Distribution

| Target | Command | Output |
|--------|---------|--------|
| macOS | `npm run dist:mac` | DMG + ZIP (x64, arm64) |
| Windows | `npm run dist:win` | NSIS installer (x64) |

Build uses `electron-builder` configured in `electron-builder.config.ts`. The `appId` is `com.teamschatnotifier.app`.

## Directory Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App entry point, orchestration
│   ├── tray-manager.ts    # System tray logic
│   ├── window-manager.ts  # BrowserWindow lifecycle
│   ├── auth/              # MSAL device code flow + token caching
│   ├── db/                # SQLite database + repos
│   ├── graph/             # Microsoft Graph API wrappers
│   ├── ipc/               # IPC handler registration
│   ├── notifications/     # Native notification dispatch
│   └── polling/           # Poll scheduler + worker
├── preload/
│   └── preload.ts         # contextBridge (invoke + on)
├── renderer/              # React UI (Vite-bundled)
│   ├── App.tsx            # Root component + nav
│   ├── main.tsx           # ReactDOM entry
│   ├── api/               # Typed IPC client
│   ├── components/        # ChatListItem, DeviceCodeModal, TenantSection
│   ├── hooks/             # useChats (IPC subscription)
│   ├── pages/             # ChatsPage, SettingsPage
│   └── store/             # Zustand app store
└── shared/                # Code shared between main + renderer
    ├── types.ts           # Type definitions
    ├── ipc-channels.ts    # IPC channel constants
    └── deep-links.ts      # URL helpers, HTML stripping, sorting
```
