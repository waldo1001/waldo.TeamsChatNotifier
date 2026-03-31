---
name: commit-push
description: 'Commit and push changes to the remote repository. Use when: user explicitly asks to commit, push, commit and push, ship it, send it, or push changes. NEVER commit or push without the user asking.'
---

# Commit & Push

## Overview

Stage, commit, and push local changes to the remote repository. **Only execute when the user explicitly requests it.**

## Procedure

### Step 1: Pre-flight checks

Run all CI checks before committing:

```bash
npm run typecheck
npm run lint
npm run test
```

**Stop if any check fails.** Fix the issues first.

### Step 2: Review changes

Show the user what will be committed:

```bash
git status
git diff --stat
```

### Step 3: Stage and commit

Stage all changes and commit with a descriptive message:

```bash
git add -A
git commit -m "<type>: <concise description>"
```

Commit message types:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, CI, config
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests

If the user provides a commit message, use it. Otherwise, infer from the changes.

### Step 4: Push

Push immediately — do NOT ask for confirmation. The user requested a push, so just do it.

```bash
git push origin $(git branch --show-current)
```

### Step 5: Verify

Report the pushed commit hash and remind the user to check CI:
`https://github.com/waldo1001/waldo.TeamsChatNotifier/actions`
