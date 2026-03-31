# Teams Chat Notifier — Implementation Plan

## Context

The user wants a local, installable desktop app that monitors Microsoft Teams chats across **multiple tenants/directories** simultaneously. It must run in the background, fire native OS notifications when new messages arrive in any chat on any tenant, and provide a quick-pop-up window to browse all chats and click to open them in Teams. Must work on both **macOS and Windows**.

Development approach: **TDD** — scaffold → write failing tests → implement → tests pass. Includes a full **GitHub Actions CI/CD** pipeline.

---

## Approach: Electron Desktop App

**Why Electron**: Cross-platform (Mac + Windows), system tray support, native OS notifications on both platforms, installable `.dmg`/`.exe`, runs silently in background.

**Auth strategy**: OAuth2 delegated auth (device code flow) — user signs in once per tenant. Tokens stored encrypted via `electron.safeStorage` (macOS Keychain / Windows DPAPI). Requires one multi-tenant Azure AD app registration (one-time setup by user).

**Polling strategy**: Poll `GET /me/chats?$expand=lastMessagePreview` every 30s (configurable). Only fetch messages for chats that changed since last poll. No webhooks — avoids public endpoint requirement for a local app.

---

## Tech Stack

| Concern | Library |
|---|---|
| Desktop framework | `electron` (latest) |
| Language | TypeScript |
| Renderer UI | React + Vite |
| Auth | `@azure/msal-node` (device code flow) |
| Graph API | `@microsoft/microsoft-graph-client` |
| Local storage | `better-sqlite3` (chats/messages) + `electron-store` (settings) |
| Unit tests | `vitest` + `@vitest/coverage-v8` |
| Component tests | `@testing-library/react` + `vitest` |
| E2E tests | `playwright` with `@playwright/test` + electron support |
| Mocking | `vitest` built-in mocks + `nock` for HTTP |
| Packaging | `electron-builder` |
| Build | `concurrently` + `tsc` + `vite` |

---

## File Structure

```
teams-chat-notifier/
├── .github/
│   └── workflows/
│       ├── ci.yml           # Runs on every push/PR: lint + unit tests + component tests
│       └── release.yml      # Runs on tag push: build + package + upload artifacts
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── vite.config.ts
├── vitest.config.ts         # Separate vitest config (unit + component)
├── vitest.config.main.ts    # Vitest config for main-process tests (Node environment)
├── playwright.config.ts     # E2E config
├── electron-builder.config.ts
├── .env.example
├── assets/
│   ├── tray-icon.png
│   ├── tray-icon-badge.png
│   └── notification-icon.png
└── src/
    ├── shared/
    │   ├── types.ts
    │   ├── ipc-channels.ts
    │   └── deep-links.ts
    ├── main/
    │   ├── index.ts
    │   ├── window-manager.ts
    │   ├── tray-manager.ts
    │   ├── auth/
    │   │   ├── auth-manager.ts
    │   │   └── token-cache.ts
    │   ├── graph/
    │   │   ├── graph-client-factory.ts
    │   │   ├── chats-api.ts
    │   │   └── messages-api.ts
    │   ├── polling/
    │   │   ├── poll-scheduler.ts
    │   │   └── poll-worker.ts
    │   ├── notifications/
    │   │   └── notification-manager.ts
    │   ├── db/
    │   │   ├── database.ts
    │   │   ├── schema.ts
    │   │   └── repositories/
    │   │       ├── tenant-repo.ts
    │   │       ├── chat-repo.ts
    │   │       └── message-repo.ts
    │   └── ipc/
    │       ├── ipc-main-handler.ts
    │       └── handlers/
    │           ├── auth-handlers.ts
    │           ├── chat-handlers.ts
    │           └── settings-handlers.ts
    ├── preload/
    │   └── preload.ts
    └── renderer/
        ├── index.html
        ├── main.tsx
        ├── api/ipc-client.ts
        ├── store/app-store.ts
        ├── pages/
        │   ├── ChatsPage.tsx
        │   └── SettingsPage.tsx
        ├── components/
        │   ├── TenantSection.tsx
        │   ├── ChatListItem.tsx
        │   ├── DeviceCodeModal.tsx
        │   └── StatusBar.tsx
        └── hooks/
            ├── useChats.ts
            └── useTenants.ts

tests/
├── unit/
│   ├── shared/
│   │   └── deep-links.test.ts
│   ├── main/
│   │   ├── db/
│   │   │   ├── tenant-repo.test.ts
│   │   │   ├── chat-repo.test.ts
│   │   │   └── message-repo.test.ts
│   │   ├── polling/
│   │   │   ├── poll-worker.test.ts    # Core new-message detection logic
│   │   │   └── poll-scheduler.test.ts
│   │   ├── auth/
│   │   │   └── auth-manager.test.ts  # Mocks MSAL
│   │   └── graph/
│   │       ├── chats-api.test.ts     # Mocks Graph HTTP responses
│   │       └── messages-api.test.ts
├── component/
│   ├── ChatListItem.test.tsx
│   ├── TenantSection.test.tsx
│   └── DeviceCodeModal.test.tsx
└── e2e/
    └── app.spec.ts                   # Playwright E2E: launch app, add tenant mock, verify chat list
```

---

## TDD Cycle Per Layer

Each layer follows: **write failing test → implement → green → refactor**

### Example: `poll-worker.test.ts` (written before poll-worker.ts exists)

```typescript
describe('PollWorker.detectNewChats', () => {
  it('returns chats where lastMessageAt is newer than stored value', () => {
    const stored = [{ id: 'chat1', last_message_at: '2024-01-01T10:00:00Z' }];
    const fetched = [{ id: 'chat1', lastMessagePreview: { createdDateTime: '2024-01-01T11:00:00Z' } }];
    expect(detectNewChats(fetched, stored)).toHaveLength(1);
  });

  it('ignores chats with unchanged lastMessageAt', () => { ... });
  it('treats null stored timestamp as always-new', () => { ... });
});

describe('PollWorker.shouldNotify', () => {
  it('returns false for messages sent by the signed-in user', () => { ... });
  it('returns false for system event messages', () => { ... });
  it('returns false for already-notified messages', () => { ... });
  it('returns true for new messages from other users', () => { ... });
});
```

### Example: `chat-repo.test.ts` (uses in-memory SQLite)

```typescript
// Uses ':memory:' database — no disk I/O, fast, isolated per test
describe('ChatRepository', () => {
  it('upserts a chat and retrieves it by tenantId', () => { ... });
  it('composite primary key (id, tenant_id) isolates same chatId across tenants', () => { ... });
  it('returns chats ordered by last_message_at desc', () => { ... });
});
```

---

## SQLite Schema

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS tenants (
  id                  TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  user_principal_name TEXT NOT NULL,
  user_id             TEXT NOT NULL,
  added_at            TEXT NOT NULL,
  last_synced_at      TEXT
);

CREATE TABLE IF NOT EXISTS chats (
  id                          TEXT NOT NULL,
  tenant_id                   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chat_type                   TEXT NOT NULL,
  topic                       TEXT,
  member_names_json           TEXT NOT NULL DEFAULT '[]',
  last_message_preview_text   TEXT,
  last_message_preview_sender TEXT,
  last_message_at             TEXT,
  last_read_at                TEXT,
  web_url                     TEXT,
  is_hidden                   INTEGER NOT NULL DEFAULT 0,
  last_polled_at              TEXT,
  updated_at                  TEXT NOT NULL,
  PRIMARY KEY (id, tenant_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id                  TEXT NOT NULL,
  chat_id             TEXT NOT NULL,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id           TEXT,
  sender_display_name TEXT,
  body_content        TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  is_system_message   INTEGER NOT NULL DEFAULT 0,
  notified            INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, tenant_id)
);
```

Messages older than 7 days pruned on each app launch (notifier, not archive).

---

## Key Design Decisions

### Auth (Critical Gotcha)
Device code flow **must** use authority `https://login.microsoftonline.com/organizations` — using `/common` causes `AADSTS90133`. After sign-in, extract real `tenantId` from the ID token and re-initialize the PCA with the specific tenant authority. One separate `PublicClientApplication` instance per tenant to prevent cross-tenant token contamination.

### Polling Logic (poll-worker.ts)
1. `GET /me/chats?$expand=lastMessagePreview&$top=50&$orderby=lastMessagePreview/createdDateTime desc`
2. Compare `lastMessagePreview.createdDateTime` vs stored `last_message_at` — only fetch messages for changed chats
3. `GET /chats/{id}/messages?$filter=lastModifiedDateTime gt {last_polled_at}&$top=20`
4. Filter to `messageType === 'message'` (skip system events)
5. Skip notifications for messages sent by signed-in user
6. `notified = 1` in DB prevents duplicate notifications across restarts
7. On first run / new tenant: set `lastPolledAt = now` to prevent notification flood

### Deep Links
Use `chat.webUrl` from Graph API directly — already tenant-scoped. Open via `shell.openExternal()` from main process.

### Tray Behavior
- Left-click: toggle window show/hide
- `win.on('close', e => { e.preventDefault(); win.hide(); })` — never destroy, just hide
- macOS: `setTitle('N')` for count; `app.dock.bounce()` on new message
- Windows: taskbar badge via `win.setOverlayIcon()`
- macOS build: `LSUIElement: true` — removes app from Dock/Cmd+Tab (pure tray app)

---

## IPC Surface

**Renderer → Main (invoke)**
- `auth:start-device-code` `{ loginHint? }` → push event with device code
- `auth:sign-out-tenant` `{ tenantId }`
- `chats:get-all` → `{ tenants, chatsByTenant }`
- `chats:open-in-teams` `{ webUrl }`
- `settings:get` / `settings:set`
- `tenants:get-all`

**Main → Renderer (push)**
- `push:chats-updated` `{ tenantId, chats }`
- `push:new-message` `{ message, chat, tenant }`
- `push:tenant-auth-state` `{ tenantId, status, errorMessage? }`
- `push:device-code-ready` `{ userCode, verificationUrl, expiresIn }`
- `push:sync-status` `{ tenantId, status }`

---

## CI/CD: GitHub Actions

### `.github/workflows/ci.yml` — runs on every push + PR

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest   # Unit + component tests don't need macOS/Windows
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit        # vitest (Node env, main process tests)
      - run: npm run test:component   # vitest (jsdom, React component tests)
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

### `.github/workflows/release.yml` — runs on `v*` tag push

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - run: npm run dist:mac
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false   # Skip code signing in CI (add later)
      - uses: actions/upload-artifact@v4
        with:
          name: mac-dist
          path: dist/*.dmg

  build-win:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - run: npm run dist:win
      - uses: actions/upload-artifact@v4
        with:
          name: win-dist
          path: dist/*.exe

  release:
    needs: [build-mac, build-win]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            mac-dist/*.dmg
            win-dist/*.exe
          generate_release_notes: true
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json --watch",
    "dev:renderer": "vite",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win",
    "lint": "eslint src tests --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --config vitest.config.main.ts",
    "test:component": "vitest run --config vitest.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:component"
  }
}
```

---

## Implementation Order (TDD)

1. **Scaffold**: package.json, tsconfig dual-config, Vite, blank Electron window boots
2. **SQLite layer** (TDD): write `*-repo.test.ts` with `:memory:` DB → implement repositories → green
3. **Shared utils** (TDD): write `deep-links.test.ts` → implement → green
4. **Graph layer** (TDD): write `chats-api.test.ts` + `messages-api.test.ts` with `nock` HTTP mocks → implement → green
5. **Poll worker** (TDD): write `poll-worker.test.ts` (pure functions: `detectNewChats`, `shouldNotify`) → implement → green
6. **Auth layer** (TDD): write `auth-manager.test.ts` mocking MSAL → implement → green
7. **IPC bridge**: preload + ipc-main-handler + all handlers
8. **Poll scheduler**: scheduler + wire to worker
9. **Notifications**: notification-manager
10. **Tray**: tray-manager (icon, badge, context menu, window toggle)
11. **Renderer components** (TDD): write component tests → implement `ChatListItem`, `TenantSection`, `DeviceCodeModal`
12. **Pages**: `ChatsPage` + `SettingsPage` wired to IPC
13. **CI setup**: push `.github/workflows/` — verify CI goes green
14. **Polish**: launch-at-login, mark-read, first-run experience
15. **Release pipeline**: tag `v0.1.0` → verify `.dmg` + `.exe` artifacts produced

---

## Verification

- Unit tests all pass in CI (`ubuntu-latest` runner)
- Add 2 tenants via device code flow → both appear in chat list
- Send test message → notification fires within poll interval, no duplicate on next poll
- Click "Open in Teams" → Teams opens to correct chat
- Close window → app stays in tray, notifications continue
- Restart → tenants reload silently, no re-auth required
- Tag a release → GitHub Actions produces `.dmg` and `.exe` artifacts
