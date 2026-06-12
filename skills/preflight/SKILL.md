---
name: preflight
description: Pre-push AI audit — UX review of changed routes, /security-review of the diff, and a perf spot-check; writes .git/preflight-stamp so the pre-push hook reminder clears. Use for /preflight before pushing.
---

# Preflight

Advisory pre-push audit of **what changed**, not the whole repo. Deterministic CI is
the safety net; preflight catches judgment-level problems before they reach a PR.

## Steps

1. **Scope the diff:** `git diff origin/main...HEAD --stat` (or `@{upstream}`).
   Classify changed files: UI components/routes, services/business logic, config/CI,
   content (MDX), dependencies (`package.json`/lockfile).
2. **UX audit (changed routes only):** map changed components/features to the routes
   that render them. Run the `/ux-audit` rubric in preflight mode (those routes,
   mobile + desktop, both themes if theme-related code changed). Skip entirely if no
   UI/content files changed.
3. **Security review of the diff:** run the built-in `/security-review`. If
   dependencies changed, also run `osv-scanner scan source --lockfile=pnpm-lock.yaml`
   and check the new versions specifically.
4. **Perf spot-check (only if relevant):** if dependencies, route components, or
   data-loading changed — `pnpm build` and compare the Next route table / `pnpm
   perf:size` against budgets. Flag any route whose first-load JS grew > 10%.
5. **Report:** one verdict block —

   ```markdown
   # Preflight — <branch> — <YYYY-MM-DD HH:MM>
   Verdict: <ready | ready-with-notes | do-not-push>
   - UX: <pass/findings, routes audited>
   - Security: <pass/findings>
   - Perf: <pass/findings or "not relevant to this diff">
   ```

6. **Stamp:** on completion (any verdict), write the stamp so the pre-push reminder
   clears:

   ```bash
   date -u +"%Y-%m-%dT%H:%M:%SZ" > .git/preflight-stamp
   ```

Findings are advisory: fix-as-you-go with the user, or note them in the report. Never
write the stamp for a run that didn't actually audit the diff.
