---
name: quality-audit
description: Weekly code-quality review — knip (dead code), jscpd (duplication), coverage deltas, plus AI code review of recent changes. Use for /quality-audit or a code-health/maintainability review.
---

# Quality Audit

Weekly, advisory. The deterministic floor (ESLint strict, 100% unit coverage) already
blocks; you look for **decay**: dead code accumulating, duplication creeping,
coverage quietly eroding, architecture drift.

## Steps

1. **Dead code & unused deps:** `pnpm quality:knip` (sandbox; summarize). For each
   finding decide: genuinely dead (propose deletion), false positive (add to knip
   config with a comment), or intentionally public API.
2. **Duplication:** `pnpm quality:dupes` (jscpd). Target < 3%. For clones above the
   threshold, judge whether extraction is warranted (rule of three; don't force DRY
   on incidental similarity) and propose where the shared code should live per the
   repo's layered architecture (service vs lib vs component).
3. **Coverage deltas:** run unit + integration coverage; compare totals against the
   last `docs/quality/baselines-*.md`. Flag any package whose coverage dropped.
4. **AI review of the recent window:** review `git log --oneline` since the last
   audit; run `/code-review` on anything unreviewed or suspicious. Check for
   architecture violations (UI importing repositories, business logic in components,
   cross-feature imports).
5. **Check the open `code-health` issues** (`gh issue list --label code-health`):
   close ones that are fixed, comment progress on the rest.

## Report format

```markdown
# Quality Audit — <YYYY-MM-DD>

| Metric | Now | Last audit | Trend |
| knip findings | | | |
| duplication % | | | |
| unit coverage | | | |
| integration coverage | | | |

## Actions
- <delete X / extract Y to Z / add tests for W> (effort S/M/L, value)
```

Append the metrics row to `docs/quality/baselines-<date>.md` (new file per audit) so
`/quality-digest` can read the trend. File or update a `code-health` issue for actions
not taken immediately.
