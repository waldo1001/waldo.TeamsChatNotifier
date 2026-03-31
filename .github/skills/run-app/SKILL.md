---
name: run-app
description: 'Run, start, or launch the Teams Chat Notifier Electron app in development mode. Use when: user asks to run the app, start the app, launch dev mode, or open the application locally.'
---

# Run App (Dev Mode)

## Overview

Start the Teams Chat Notifier Electron desktop app in development mode. This runs three concurrent processes: TypeScript compiler for main process (watch mode), Vite dev server for the renderer, and the Electron shell.

## Prerequisites

- Node.js and npm installed
- Dependencies installed (`npm install`)
- Port 5173 must be free (Vite dev server)

## Procedure

### 1. Kill stale processes

Before starting, ensure no leftover processes are holding ports or locks:

```bash
pkill -f "electron" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "wait-on" 2>/dev/null
pkill -f "tsc.*watch" 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
sleep 1
```

### 2. Start the app

Run the dev script (uses `concurrently` to run all three processes):

```bash
npm run dev
```

This runs:
- `dev:main` — `tsc -p tsconfig.main.json --watch` (compiles main process)
- `dev:renderer` — `vite` (serves renderer on http://localhost:5173)
- `dev:electron` — `wait-on dist/main/main/index.js http://localhost:5173 && electron .` (launches Electron once both are ready)

### 3. Verify startup

The app is running when you see the Electron window appear. Watch the terminal for errors. Common issues:

| Symptom | Fix |
|---------|-----|
| Port 5173 in use | Kill stale Vite: `lsof -ti :5173 \| xargs kill -9` |
| `Cannot find module dist/main/main/index.js` | Run `npm run build:main` first, then retry |
| Missing dependencies | Run `npm install` |

## Individual Process Commands

If you need to run processes separately (e.g., for debugging):

```bash
# Terminal 1: Main process compiler
npm run dev:main

# Terminal 2: Renderer dev server
npm run dev:renderer

# Terminal 3: Electron (after both above are ready)
npm run dev:electron
```

## Build Only (no dev server)

```bash
npm run build        # Build both main + renderer
npm run build:main   # Build main process only
npm run build:renderer # Build renderer only
```
