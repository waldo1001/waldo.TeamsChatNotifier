# Dependencies

## Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@azure/msal-node` | ^2.16.2 | Microsoft Authentication Library for Node.js — handles device code flow and silent token acquisition for each tenant |
| `@microsoft/microsoft-graph-client` | ^3.0.7 | Official Microsoft Graph SDK — used to query `/me/chats` and `/chats/{id}/messages` |
| `better-sqlite3` | ^11.10.0 | Synchronous SQLite3 binding for Node.js — stores tenants, chats, and messages locally |
| `dotenv` | ^17.3.1 | Loads `.env` file into `process.env` — provides `AZURE_CLIENT_ID` |
| `electron-store` | ^8.2.0 | Simple key-value persistence for Electron — stores app settings and poll bookmarks |
| `react` | ^19.2.4 | UI library for the renderer process |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `zustand` | ^5.0.12 | Lightweight state management — single `useAppStore` with tenants, chats, settings, sync state |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@testing-library/jest-dom` | ^6.6.3 | Custom DOM matchers for component tests (`toBeInTheDocument`, `toHaveTextContent`, etc.) |
| `@testing-library/react` | ^16.3.0 | React component testing utilities (`render`, `screen`, `fireEvent`) |
| `@testing-library/user-event` | ^14.6.1 | Simulates real user interactions (clicks, typing) in component tests |
| `@types/better-sqlite3` | ^7.6.12 | TypeScript type definitions for better-sqlite3 |
| `@types/node` | ^22.15.3 | TypeScript type definitions for Node.js APIs |
| `@types/react` | ^19.1.2 | TypeScript type definitions for React |
| `@types/react-dom` | ^19.1.2 | TypeScript type definitions for ReactDOM |
| `@typescript-eslint/eslint-plugin` | ^8.31.1 | ESLint plugin for TypeScript-specific rules |
| `@typescript-eslint/parser` | ^8.31.1 | ESLint parser for TypeScript |
| `@vitejs/plugin-react` | ^4.4.1 | Vite plugin for React (JSX transform, fast refresh) |
| `@vitest/coverage-v8` | ^3.1.2 | V8-based code coverage provider for Vitest |
| `concurrently` | ^9.1.2 | Runs multiple npm scripts in parallel (`dev:main`, `dev:renderer`, `dev:electron`) |
| `electron` | ^35.2.1 | Electron framework — desktop app shell |
| `electron-builder` | ^25.1.8 | Packages the app as DMG/ZIP (macOS) and NSIS installer (Windows) |
| `eslint` | ^9.25.1 | JavaScript/TypeScript linter |
| `jsdom` | ^26.1.0 | DOM implementation for Node.js — Vitest environment for component tests |
| `nock` | ^14.0.3 | HTTP request interception for testing Graph API calls |
| `typescript` | ^5.8.3 | TypeScript compiler |
| `vite` | ^6.3.3 | Frontend build tool — bundles the renderer process and serves dev server |
| `vitest` | ^3.1.2 | Test runner — used for both unit tests (Node env) and component tests (jsdom env) |
| `wait-on` | ^8.0.3 | Waits for resources (files, HTTP endpoints) before starting Electron in dev mode |

## Dependency Graph

```
Main Process
├── @azure/msal-node         (auth)
├── @microsoft/graph-client   (API calls)
├── better-sqlite3            (local storage)
├── dotenv                    (env config)
└── electron-store            (settings)

Renderer Process
├── react + react-dom         (UI)
└── zustand                   (state)

Build & Test
├── vite + @vitejs/plugin-react   (bundler)
├── vitest + @vitest/coverage-v8  (testing)
├── @testing-library/*            (component test utils)
├── nock                          (HTTP mocking)
├── electron-builder              (packaging)
└── concurrently + wait-on        (dev workflow)
```
