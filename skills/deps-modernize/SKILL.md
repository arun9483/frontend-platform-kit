---
name: deps-modernize
description: Replace Renovate — pnpm outdated + osv-scanner + Context7 docs lookup, producing grouped upgrade PRs with exact pinned versions via gh. Use for /deps-modernize or dependency upgrade planning.
---

# Dependencies Modernize

Weekly/on-demand. You are the Renovate replacement, with judgment: group related
upgrades, read changelogs via Context7 before bumping, never break the repo
conventions (exact pinned versions — no `^`/`~` in deps/devDeps).

## Steps

1. **Inventory:** `pnpm outdated -r` (sandbox; summarize). Also
   `osv-scanner scan source --lockfile=pnpm-lock.yaml` — security-driven bumps get
   priority and their own PR.
2. **Classify each outdated package:** patch / minor / major; runtime dependency vs
   devDependency; framework-coupled (next/react/typescript-eslint must move together)
   vs independent.
3. **Research majors and framework bumps via Context7** (`resolve-library-id` →
   `query-docs`): breaking changes, migration steps, codemods. Never propose a major
   bump without listing its breaking changes and the migration work required.
4. **Group into upgrade batches:**
   - `security` — anything fixing a vulnerability (one PR, highest priority)
   - `patch+minor` — low-risk batch (one PR)
   - one PR **per major** (with migration notes in the PR body)
   - framework sets (e.g. next + eslint-config-next + @types/react) move atomically.
5. **For each batch the user approves:** branch, set exact pinned versions,
   `pnpm install`, run the full local gate (`pnpm lint && pnpm typecheck && pnpm test
   && pnpm build`), apply migration changes if needed, then open a PR via `gh pr
   create` with: what changed, why now, breaking changes, migration applied, link to
   advisories/changelogs.

## Constraints

- Exact pinned versions everywhere; `peerDependencies` may use `>=`;
  `workspace:*` for internal packages.
- Do not bump past what Context7/changelog research can justify.
- If a batch fails the local gate, report the failure and either fix the migration or
  drop the offending package from the batch — never push a red branch.

## Report format (before opening PRs)

```markdown
# Deps Modernize — <YYYY-MM-DD>

## Proposed batches
### 1. security (PR now): <pkg a@x→y>, ... — fixes <GHSA ids>
### 2. patch+minor: <list>
### 3. major: <pkg> <x→y> — breaking: <list> — migration: <steps, effort>
### Deferred: <pkg — reason (e.g. peer conflict, risky, wait for .1 release)>
```
