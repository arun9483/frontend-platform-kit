---
name: quality-digest
description: Monthly KPI-delta digest from committed baselines + GitHub issue history, written to docs/quality/digests/<YYYY-MM>.md. Use for /quality-digest or a monthly quality/security status report.
---

# Quality Digest

Monthly, advisory. The dashboard replacement: one committed markdown file per month
with KPI deltas, read top-down by a human in two minutes.

## Inputs

1. **Baselines:** every `docs/quality/baselines-*.md` + `lighthouse-baseline.json` +
   `.size-limit.json` changes this month (`git log --since="1 month ago" --
   docs/quality .size-limit.json`).
2. **Issues:** `gh issue list --state all --label "sev:critical,sev:high,sev:medium,
   sev:low,code-health,ux-regression" --search "updated:>=<first-of-month>"` —
   opened/closed counts, time-to-close for sev issues.
3. **CI health:** `gh run list --workflow CI --created ">=<first-of-month>"` — p50
   duration and failure/re-run rate if derivable.
4. **Waivers:** entries in `osv-scanner.toml` and `a11y-known-issues.json` — count,
   and which expire within 30 days.

## KPI table (mirror the framework's targets)

| Pillar | KPI | Target | This month | Last month | Trend |
| --- | --- | --- | --- | --- | --- |
| Security | open critical/high vulns; MTTR | 0 crit; <24h/<7d | | | |
| Security | secrets in history | 0 | | | |
| Performance | lighthouse perf (median, key routes) | ≥ 90, ≥ baseline | | | |
| Performance | bundle vs budget headroom | green | | | |
| Quality | duplication % / knip findings | <3% / ↓ | | | |
| UX | new serious+ axe violations / allowlist size | 0 / ↓ | | | |
| Velocity | PR CI p50 / flake rate | <10min / <2% | | | |

## Output

Write `docs/quality/digests/<YYYY-MM>.md`:

```markdown
# Quality Digest — <YYYY-MM>

## TL;DR
<3 bullets: the one thing that improved, the one thing that regressed, the one action for next month>

## KPIs
<the table above, filled; "n/a" where data doesn't exist yet — never invent numbers>

## Waiver burn-down
<count, expiring soon, overdue>

## Recommended actions (max 3, ranked)
```

Compare against the previous digest if one exists. If data for a KPI is missing, say
so and propose how to start capturing it — do not fabricate.
