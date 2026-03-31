# Testing Guide

## Test Structure

```
tests/
├── unit/               # Main process + shared (vitest, Node env)
│   ├── main/
│   │   ├── auth/
│   │   │   └── auth-manager.test.ts
│   │   ├── db/
│   │   │   ├── chat-repo.test.ts
│   │   │   ├── message-repo.test.ts
│   │   │   └── tenant-repo.test.ts
│   │   ├── graph/
│   │   │   ├── chats-api.test.ts
│   │   │   └── messages-api.test.ts
│   │   └── polling/
│   │       └── poll-worker.test.ts
│   └── shared/
│       └── deep-links.test.ts
├── component/          # React components (vitest, jsdom env)
│   ├── setup.ts
│   ├── ChatListItem.test.tsx
│   ├── DeviceCodeModal.test.tsx
│   └── TenantSection.test.tsx
└── e2e/                # Full app flows (placeholder for Playwright)
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | Run unit tests (Node environment) |
| `npm run test:component` | Run component tests (jsdom environment) |
| `npm run test` | Run all tests (unit + component) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with V8 coverage report |

## Configuration

### Unit Tests — `vitest.config.main.ts`

- **Environment**: Node
- **Include**: `tests/unit/**/*.test.ts`
- **Coverage**: `src/main/**/*.ts` and `src/shared/**/*.ts` (excludes `src/main/index.ts`)
- **Alias**: `@shared` → `src/shared`

### Component Tests — `vitest.config.ts`

- **Environment**: jsdom
- **Include**: `tests/component/**/*.test.tsx`
- **Setup**: `tests/component/setup.ts` (imports `@testing-library/jest-dom`)
- **Plugin**: `@vitejs/plugin-react` (JSX transform)
- **Coverage**: `src/renderer/**/*.tsx` and `src/renderer/**/*.ts`
- **Alias**: `@shared` → `src/shared`

## Conventions

### File Naming

- Unit test files mirror the source structure: `src/main/db/repositories/chat-repo.ts` → `tests/unit/main/db/chat-repo.test.ts`
- Component test files are named after the component: `ChatListItem.tsx` → `ChatListItem.test.tsx`

### Test Organization

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange, Act, Assert
    });
  });
});
```

### Mocking

| What | How |
|------|-----|
| External modules (Electron, MSAL) | `vi.mock('module-name')` at the top of the file |
| Individual functions | `vi.fn()` |
| HTTP requests (Graph API) | `nock` for intercepting HTTP calls |
| Timers | `vi.useFakeTimers()` / `vi.useRealTimers()` |
| Reset between tests | `vi.clearAllMocks()` in `beforeEach` |

### Component Test Patterns

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../../src/renderer/components/ComponentName';

it('renders expected text', () => {
  render(<ComponentName prop="value" />);
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

Component tests mock `window.electronAPI` in the setup file to prevent IPC calls during testing.

## TDD Workflow

This project follows strict Test-Driven Development:

1. **RED** — Write failing tests that describe the expected behavior.
2. **GREEN** — Write the minimum code to make tests pass.
3. **REFACTOR** — Clean up while keeping tests green.

See the [TDD Workflow skill](../../.github/skills/tdd-workflow/SKILL.md) for the full procedure.

## Coverage

Run `npm run test:coverage` to generate a coverage report. The report is output in three formats:

- **text** — printed to the terminal
- **lcov** — for CI integration
- **html** — browsable report in `coverage/`

Coverage includes `src/main/` and `src/shared/` (excluding the main entry point `src/main/index.ts` which is integration glue).

## What Each Test Suite Covers

| Test File | Module Under Test | Key Scenarios |
|-----------|-------------------|---------------|
| `auth-manager.test.ts` | `AuthManager` | Tenant registration, device code flow, silent token acquisition, sign-out |
| `chat-repo.test.ts` | `ChatRepository` | Upsert, find by ID, find by tenant, hidden chat filtering, mark read |
| `message-repo.test.ts` | `MessageRepository` | Upsert, find by chat, notification tracking, system message filtering, pruning |
| `tenant-repo.test.ts` | `TenantRepository` | CRUD operations, last synced updates |
| `chats-api.test.ts` | `ChatsApi` | Graph chat listing, pagination |
| `messages-api.test.ts` | `MessagesApi` | Graph message fetching with filters |
| `poll-worker.test.ts` | Poll worker functions | Change detection, notification decisions, Graph response mapping |
| `deep-links.test.ts` | Deep link utilities | URL generation, HTML stripping, truncation, chat sorting |
| `ChatListItem.test.tsx` | `ChatListItem` | Rendering, unread indicators, timestamps, click handling |
| `DeviceCodeModal.test.tsx` | `DeviceCodeModal` | Code display, countdown timer, copy, cancel |
| `TenantSection.test.tsx` | `TenantSection` | Expand/collapse, unread badge, empty state |
