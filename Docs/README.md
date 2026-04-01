# Teams Chat Notifier — Documentation

A cross-platform Electron desktop app that monitors Microsoft Teams chats across multiple tenants and delivers native notifications.

## Documentation Index

| Document | Audience | Description |
|----------|----------|-------------|
| [Users / Getting Started](Users/getting-started.md) | End users | Installation, sign-in, and daily usage |
| [Setup / Configuration](Setup/configuration.md) | Administrators | All settings, environment variables, and deployment |
| [Dev / Architecture](Dev/architecture.md) | Developers | System architecture, process model, and data flow |
| [Dev / IPC Channels](Dev/ipc-channels.md) | Developers | Complete IPC channel reference (renderer ↔ main) |
| [Dev / Database Schema](Dev/database-schema.md) | Developers | SQLite tables, indexes, and repository layer |
| [Dev / Dependencies](Dev/Dependencies/dependencies.md) | Developers | Runtime and dev dependency catalogue |
| [Tests / Testing Guide](Tests/testing-guide.md) | Developers / QA | Test structure, commands, and conventions |
| [CHANGELOG](CHANGELOG.md) | Everyone | Chronological change log |

## Quick Links

- **Repository**: `teams-chat-notifier` (v1.0.7)
- **License**: MIT
- **Platforms**: macOS (x64, arm64), Windows (x64)
- **Tech Stack**: Electron 35 · TypeScript 5.8 · React 19 · Vite 6 · better-sqlite3 · MSAL Node · Zustand
