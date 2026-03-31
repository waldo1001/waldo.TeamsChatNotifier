---
name: release
description: 'Release a new version (patch, minor, or major). Use when: user asks to release, bump version, publish, cut a release, do a patch/minor/major release, tag a version.'
---

# Release Flow

## Overview

Bump the version, update the changelog, commit, tag, and push — triggering the existing GitHub Actions release workflow (`.github/workflows/release.yml`) which builds macOS + Windows packages and publishes a GitHub Release.

## Prerequisites

- Working tree is clean (no uncommitted changes)
- All tests pass (`npm run test`)
- Lint and typecheck pass (`npm run lint && npm run typecheck`)
- On the `main` branch

## Procedure

### Step 1: Pre-flight checks

Run these checks and **stop if any fail**:

```bash
# Ensure clean working tree
git status --porcelain

# Ensure on main branch
git branch --show-current

# Run full CI checks
npm run typecheck
npm run lint
npm run test
```

If the working tree is dirty, ask the user whether to commit or stash first.

### Step 2: Determine the release type

Ask the user (if not already specified) which bump type:
- **patch** — bug fixes, CI fixes, docs (0.1.0 → 0.1.1)
- **minor** — new features, backward-compatible (0.1.0 → 0.2.0)
- **major** — breaking changes (0.1.0 → 1.0.0)

### Step 3: Bump version in package.json

Use `npm version` which updates `package.json` and creates a git tag:

```bash
npm version <patch|minor|major> --no-git-tag-version
```

Read the new version from `package.json` to use in later steps.

### Step 4: Update CHANGELOG.md

Insert a new version section at the top of `Docs/CHANGELOG.md`, **below** the intro line and **above** the previous version entry. Use this format:

```markdown
## <new-version> — <YYYY-MM-DD>

### <Category>
- <Description of change>
```

Categories to use (omit empty ones):
- **Features** — new functionality
- **Fixes** — bug fixes
- **Improvements** — refactors, performance, DX
- **CI/CD** — pipeline and build changes

To populate the changes, review commits since the last tag:

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline
```

If there are no tags yet, review all commits.

### Step 5: Commit the release

```bash
git add package.json Docs/CHANGELOG.md
git commit -m "release: v<new-version>"
```

### Step 6: Create the git tag

```bash
git tag v<new-version>
```

### Step 7: Push commit and tag

**Ask user for confirmation before pushing.** Then:

```bash
git push origin main
git push origin v<new-version>
```

The tag push triggers `.github/workflows/release.yml` which:
1. Runs tests
2. Builds macOS (.dmg) and Windows (.exe) packages
3. Creates a GitHub Release with auto-generated release notes

### Step 8: Verify

Direct the user to check the Actions tab:
`https://github.com/waldo1001/waldo.TeamsChatNotifier/actions`

## Rollback

If something goes wrong after pushing:

```bash
# Delete remote tag
git push origin --delete v<version>
# Delete local tag
git tag -d v<version>
# Revert commit
git revert HEAD
git push origin main
```
