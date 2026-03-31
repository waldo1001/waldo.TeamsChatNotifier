# Configuration Guide

## Prerequisites

- **Node.js** 18+ and npm
- An **Azure AD app registration** with the following API permissions (delegated):
  - `Chat.ReadBasic`
  - `Chat.Read`
  - `User.Read`
  - `offline_access`
- The app registration must have **"Allow public client flows"** enabled (required for device code flow).

## Environment Variables

Create a `.env` file in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_CLIENT_ID` | Yes | Azure AD application (client) ID |

Example:

```env
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The app reads this via `dotenv` at startup. If not set, authentication will fail.

## App Settings

Settings are persisted in `electron-store` (JSON file in the user data directory). They can be changed in the Settings page of the UI.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `pollIntervalSeconds` | number | `30` | How often (in seconds) the app polls for new messages. Options: 15, 30, 60, 300 |
| `notificationsEnabled` | boolean | `true` | Whether native notifications are shown |
| `launchAtLogin` | boolean | `true` | Whether the app starts automatically on OS login |
| `showMessagePreviewInNotification` | boolean | `true` | Show message content in notifications (vs. generic "New message") |
| `showHiddenChats` | boolean | `false` | Include chats hidden in Teams |

### Settings Storage Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/teams-chat-notifier/config.json` |
| Windows | `%APPDATA%/teams-chat-notifier/config.json` |

## Database Location

The SQLite database is stored in the Electron `userData` directory:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/teams-chat-notifier/teams-chat-notifier.db` |
| Windows | `%APPDATA%/teams-chat-notifier/teams-chat-notifier.db` |

See [Dev / Database Schema](../Dev/database-schema.md) for the full schema reference.

## Token Cache Location

Encrypted MSAL token caches are stored per-tenant:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/teams-chat-notifier/token-caches/{tenantId}.cache` |
| Windows | `%APPDATA%/teams-chat-notifier/token-caches/{tenantId}.cache` |

Tokens are encrypted using `electron.safeStorage` backed by the OS keychain. If encryption is unavailable, tokens are not persisted to disk.

## Azure AD App Registration Setup

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Click **New registration**.
3. Set a name (e.g. "Teams Chat Notifier").
4. Under **Supported account types**, select **Accounts in any organizational directory** (multi-tenant).
5. Leave **Redirect URI** blank (device code flow does not require one).
6. Click **Register**.
7. Copy the **Application (client) ID** — this is your `AZURE_CLIENT_ID`.
8. Go to **Authentication** → under **Advanced settings**, enable **Allow public client flows** → Save.
9. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:
   - `Chat.ReadBasic`
   - `Chat.Read`
   - `User.Read`
   - `offline_access`
10. Click **Grant admin consent** if required by your organization.

> **Note**: The app uses the `/organizations` authority (not `/common`) to avoid `AADSTS90133` errors with personal Microsoft accounts.

## Development Setup

```bash
# Install dependencies
npm install

# Start development mode (main + renderer + electron)
npm run dev
```

This runs three processes concurrently:
1. `tsc -p tsconfig.main.json --watch` — compiles the main process
2. `vite` — serves the renderer at `http://localhost:5173`
3. `electron .` — launches the app (waits for both to be ready)

## Build for Distribution

```bash
# Build both main and renderer
npm run build

# Package for macOS
npm run dist:mac

# Package for Windows
npm run dist:win
```

Packaged app output is written to `dist/packages/`.

## Single Instance Lock

The app enforces a single-instance lock. If a second instance is launched, it activates the existing window instead. This prevents duplicate polling and notifications.
