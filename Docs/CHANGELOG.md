# Changelog

All notable changes to Teams Chat Notifier are documented here, grouped by ISO week (newest first).

## 0.1.0 — Initial Release

### Features
- Multi-tenant Microsoft 365 account support via device code flow
- Real-time polling of Teams chats via Microsoft Graph API (`/me/chats`, `/chats/{id}/messages`)
- Native desktop notifications for new messages with click-to-open in Teams
- SQLite local database for offline chat and message storage
- System tray integration with unread count badge (macOS) and context menu
- Configurable poll interval (15s / 30s / 1m / 5m)
- Search and filter across all chats
- Unread-first chat sorting
- Hidden chat toggle
- Message preview in notifications (configurable)
- Launch at login support
- Encrypted token cache via Electron safeStorage
- Automatic 7-day message pruning
- Single-instance enforcement
- macOS (x64, arm64) and Windows (x64) packaging

### Architecture
- Electron main/renderer/preload process model with `contextIsolation: true`
- Zustand state management in the renderer
- Typed IPC layer with 10 invoke channels and 5 push channels
- Repository pattern over better-sqlite3 with WAL mode
- TDD workflow with Vitest (unit + component tests)
