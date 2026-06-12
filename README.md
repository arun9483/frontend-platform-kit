# frontend-platform-kit

AI-first frontend quality & security framework for all `arun-dev` frontend repos.
Two layers:

- **Deterministic layer** (this repo's reusable GitHub Actions workflows + free CLIs:
  eslint, tsc, vitest, playwright, osv-scanner, gitleaks, lighthouse, size-limit,
  knip, jscpd) — blocking gates that always run. No accounts, no dashboards, no AI.
- **Intelligence layer** (this repo's Claude Code skills, installable as a plugin) —
  `/preflight`, `/ux-audit`, `/security-audit`, `/perf-audit`, `/quality-audit`,
  `/deps-modernize`, `/quality-digest`. Advisory, interactive, runs locally.

Reports and baselines live in each consumer repo under `docs/quality/`; findings
become GitHub issues (`sev:*`, `code-health`, `ux-regression` labels). History = git.

## Onboarding a new repo (< 1 hour)

1. **CI (~25 lines).** Add `.github/workflows/ci.yml`:

   ```yaml
   name: CI
   on:
     pull_request:
       branches: [main]
   concurrency:
     group: ci-${{ github.ref }}
     cancel-in-progress: true
   jobs:
     quality:
       uses: arun9483/frontend-platform-kit/.github/workflows/quality.yml@v1
       secrets: inherit
     security:
       uses: arun9483/frontend-platform-kit/.github/workflows/security.yml@v1
     performance:
       uses: arun9483/frontend-platform-kit/.github/workflows/performance.yml@v1
       with:
         routes: '/'
       secrets: inherit
     ux:
       uses: arun9483/frontend-platform-kit/.github/workflows/ux-regression.yml@v1
       secrets: inherit
   ```

   Always pin to a tag (`@v1`) — **never `@main`**.

   Optional wrappers (copy from arun-dev-platform): `nightly.yml` (cron →
   `nightly-audit.yml@v1`), `weekly.yml` (cron → `code-health.yml@v1`),
   `merge-main.yml` (cross-browser e2e on push to main),
   `update-snapshots.yml` (label-triggered visual-baseline regeneration).

2. **Repo contract.** Root scripts: `lint`, `format:check`, `typecheck`, `test`,
   `build`, `test:e2e` (forwards args to playwright), `perf:size`, `quality:knip`,
   `quality:dupes`. An `.nvmrc`. Shared lint/TS policy via `@arun-dev/eslint-config`
   + `@arun-dev/ts-config` (npm).

3. **Claude Code plugin.** `/plugin marketplace add arun9483/frontend-platform-kit`,
   then install `frontend-platform-kit`. Add the stale-preflight reminder to
   `.husky/pre-push` and `gitleaks protect --staged` to `.husky/pre-commit`
   (copy from arun-dev-platform).

4. **Baselines (record, don't gate).** Run the lighthouse action once locally or let
   the first CI run record `docs/quality/lighthouse-baseline.json`; set
   `.size-limit.json` budgets from the first build; commit
   `docs/quality/baselines-<date>.md` (template: `docs/baselines-template.md`).

5. **Branch protection.** Require the named checks (`quality`, `security`,
   `performance`, `ux`) on the default branch via repo/org ruleset.

## Governance

- **Severity SLAs:** critical = blocks CI + auto-issue + 24h · high = blocks + 7d ·
  medium/low = monthly triage in the digest.
- **Waivers:** every exception (`osv-scanner.toml` ignore, `a11y-known-issues.json`
  entry) requires justification + owner + expiry ≤ 90 days, reviewed in PR. No
  permanent exceptions.
- **Budgets ratchet:** lighthouse asserts "no worse than committed baseline";
  baselines/budgets are tightened quarterly, never silently loosened.
- **Versioning:** breaking workflow changes bump the major tag (`v1` → `v2`);
  consumers migrate deliberately. A bad `@main` must never be able to break every
  repo at once.

## Releasing

```bash
git tag -f v1 && git push -f origin v1     # move the floating major tag
git tag v1.x.y && git push origin v1.x.y   # immutable point release
```
