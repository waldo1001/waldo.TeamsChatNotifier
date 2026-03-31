---
name: tdd-workflow
description: 'Test-Driven Development workflow for this project. Use when: writing new code, implementing features, fixing bugs, adding functionality, creating new modules, refactoring. ALWAYS apply TDD: write tests first, verify they fail, implement code, verify tests pass. Use when: any code change, new feature, bug fix, refactoring.'
---

# TDD Workflow

## Core Principle

**NEVER write implementation code before writing tests.** Every code change follows the Red-Green-Refactor cycle.

## Procedure

### Step 1: Understand the requirement

- Clarify what needs to be built or changed
- Identify the module/file that will be affected
- Determine the test type needed:
  - **Unit test** (`tests/unit/`) — main process logic, shared utilities
  - **Component test** (`tests/component/`) — React components rendering/behavior
  - **E2E test** (`tests/e2e/`) — full application flows

### Step 2: Scaffold test file (if needed)

If no test file exists for the target module, create one following project conventions:

**Unit tests** — `tests/unit/main/<module-path>/<module-name>.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('<ModuleName>', () => {
  // tests go here
});
```

**Component tests** — `tests/component/<ComponentName>.test.tsx`
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentName } from '../../src/renderer/components/ComponentName';

describe('<ComponentName>', () => {
  // tests go here
});
```

### Step 3: Write failing tests (RED)

Write tests that describe the **expected behavior** of the code you're about to implement:

- Test the happy path
- Test edge cases and error conditions
- Test boundary values
- Use descriptive test names: `it('should return empty array when no chats exist')`
- Mock external dependencies (Graph API, database, Electron APIs) using `vi.mock()`

### Step 4: Run tests — confirm they FAIL

```bash
# Unit tests
npm run test:unit

# Component tests
npm run test:component

# All tests
npm run test
```

**This step is mandatory.** If tests pass before implementation, the tests are not testing new behavior — revisit them.

Expected output: tests should fail with clear error messages indicating the missing functionality.

### Step 5: Implement the minimum code (GREEN)

Write **only** the code needed to make the failing tests pass:

- Do not add extra features
- Do not optimize prematurely
- Do not add error handling beyond what tests require
- Focus on making tests green with the simplest correct implementation

### Step 6: Run tests — confirm they PASS

```bash
npm run test
```

**All tests must pass** — both the new ones and all existing ones. If existing tests break, fix the implementation, not the tests (unless the tests were wrong).

### Step 7: Refactor (if needed)

Only after tests are green:

- Clean up duplication
- Improve naming
- Extract helpers if the same pattern appears 3+ times
- Re-run tests after every refactoring step

## Test Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | Unit tests (main process + shared, Node environment) |
| `npm run test:component` | Component tests (React, jsdom environment) |
| `npm run test` | All tests (unit + component) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage report |

## Test Configuration

- **Unit tests**: `vitest.config.main.ts` — Node environment, files in `tests/unit/**/*.test.ts`
- **Component tests**: `vitest.config.ts` — jsdom environment, files in `tests/component/**/*.test.tsx`, setup in `tests/component/setup.ts`

## Mocking Conventions

- Use `vi.mock()` for module-level mocks
- Use `vi.fn()` for individual function mocks
- Use `nock` for HTTP request interception (Graph API calls)
- Mock Electron APIs (`electron`, `electron-store`) at the module level
- Reset mocks in `beforeEach` with `vi.clearAllMocks()`

## Anti-patterns

- **Writing code before tests** — violates TDD; always write tests first
- **Tests that never fail** — if a test passes immediately, it's not testing new behavior
- **Testing implementation details** — test behavior and outcomes, not internal method calls
- **Skipping the red phase** — always verify tests fail before implementing
- **Giant test files** — keep test files focused on one module; split if >300 lines
