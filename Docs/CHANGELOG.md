# Changelog

All notable changes to Teams Chat Notifier are documented here, grouped by ISO week (newest first).

## 1.0.7 — 2026-04-01

### Features
- **Open in browser** button on each chat item — opens the Teams URL in the default browser instead of the Teams desktop app
- Settings page now shows an inline error message when the device-code auth flow fails

### Dev
- VS Code launch config updated: added `--remote-debugging-port=9222`, fixed `outFiles` glob, switched pre-launch task to `dev:start`
- New `dev:start` VS Code task that runs `dev:renderer` then `build:main` in sequence

## 1.0.6 — 2026-04-01

### Fixes
- Reverted tray icon to the original blue/coloured icon — the monochrome template icon was invisible on dark macOS menu bars

## 1.0.5 — 2026-04-01

### Fixes
- Fixed tray and window icon asset path in packaged app (`process.resourcesPath` → `app.getAppPath()`) so icons are found inside the `.asar` archive
- Added monochrome template icon (`tray-iconTemplate.png` @1x/@2x) for proper light/dark mode adaptation in the macOS menu bar
- Fixed install script: GitHub artifact filenames use dots instead of spaces, so `APP_NAME` is now transformed with `tr ' ' '.'` before building the download URL

## 1.0.4 — 2026-04-01

### Features
- One-line macOS install script (`scripts/install.sh`) — downloads and installs without Gatekeeper warnings

### Improvements
- Release workflow ready for Apple Developer ID signing & notarization (just add GitHub secrets)
- GitHub Release page now includes installation instructions for macOS and Windows

### CI/CD
- Conditional notarization: uses real certificate when `CSC_LINK` secret is set, falls back to ad-hoc signing
- Release body includes install instructions and `xattr -cr` workaround

## 1.0.3 — 2026-04-01

### Fixes
- Fixed "app is damaged" error: moved ad-hoc codesign to `afterSign` hook and sign all nested binaries bottom-up before the outer `.app` bundle

## 1.0.2 — 2026-04-01

### Fixes
- Ad-hoc codesign macOS app before DMG creation via `afterPack` hook (fixes "cannot verify" Gatekeeper warning)

## 1.0.1 — 2026-04-01

### Fixes
- Fixed electron-builder not loading config (added explicit `--config` flag)
- Fixed `dist/` files excluded from app package by moving build output to `release/`
- Fixed electron-builder auto-publish error in CI (added `--publish never`)
- Ad-hoc codesign macOS builds to prevent "damaged app" error on Apple Silicon

### CI/CD
- Upload macOS `.zip` alongside `.dmg` in release artifacts
- Release workflow now includes ad-hoc codesign step

## 1.0.0 — 2026-04-01

### Features
- Theme system with multiple dark themes (Midnight, Carbon, Ocean, Forest, Monokai)
- Teams & Channels support alongside direct chats
- App version display in settings
- Release workflow skill for on-demand patch/minor/major releases
- Commit & push skill for streamlined CI-validated deployments

### Fixes
- Removed unused imports to pass CI lint checks (`path`, `unreadCount`, `Channel`, `ThemeId`)
- Replaced forbidden `require()` with ES module import in window-manager

### CI/CD
- GitHub Actions CI pipeline (typecheck, lint, unit tests, component tests, coverage)
- GitHub Actions release pipeline (macOS .dmg + Windows .exe via electron-builder)
- npm `preversion` hook runs full CI checks before version bumps

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
