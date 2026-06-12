# Quality Baselines — <YYYY-MM-DD>

> Captured by Phase 0 (record, don't gate) or a `/quality-audit` run.
> Committed in-repo; trend = git history. See `docs/quality/` in the consumer repo.

## Lighthouse (median of 3, production build, key routes)

| Route | Perf | A11y | LCP (ms) | TBT (ms) | CLS |
| --- | --- | --- | --- | --- | --- |

Machine-readable ratchet source: `docs/quality/lighthouse-baseline.json`.

## Bundle sizes (gzip)

| Budget entry | Size | Budget |
| --- | --- | --- |

Source of truth: `.size-limit.json`.

## Dependency vulnerabilities (osv-scanner)

| Package | CVSS | IDs | Exploitability triage |
| --- | --- | --- | --- |

## Accessibility (axe, wcag2a + wcag2aa, all routes)

| Route | Serious | Critical | Notes |
| --- | --- | --- | --- |

Known issues allowlist: `apps/web/tests/e2e/a11y-known-issues.json` (owner + expiry ≤ 90 days each).

## Code health

| Metric | Value |
| --- | --- |
| Unit coverage (lines) | |
| Integration coverage (lines) | |
| knip findings | |
| jscpd duplication % | |
