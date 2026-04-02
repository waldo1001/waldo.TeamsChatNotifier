# Claude Code Instructions

## Skills & Agents

All custom skills and agents are maintained in `.github/` — the same location used by GitHub Copilot — so there is a single source of truth.

- **Skills** — `.github/skills/<name>/SKILL.md`
- **Agents** — `.github/agents/<name>.agent.md`

When the user asks you to do something that matches a skill or agent description, read the corresponding file and follow its procedure exactly.

### Available Skills

| Trigger phrases | Skill file |
|---|---|
| release, patch release, minor release, major release, bump version, cut a release | `.github/skills/release/SKILL.md` |
| commit, push, commit and push, ship it | `.github/skills/commit-push/SKILL.md` |
| run the app, start the app, launch | `.github/skills/run-app/SKILL.md` |
| tdd, test-driven, write tests first | `.github/skills/tdd-workflow/SKILL.md` |

### Available Agents

| Trigger phrases | Agent file |
|---|---|
| implement with TDD, feature with tests | `.github/agents/tdd-developer.agent.md` |
