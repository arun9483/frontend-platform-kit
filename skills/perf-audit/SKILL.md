---
name: perf-audit
description: Run lighthouse locally against the committed baseline, explain any regression (which commit/bundle caused it), and propose fixes. Use for /perf-audit or performance regression investigation.
---

# Performance Audit

CI asserts budgets deterministically (size-limit + lighthouse ratchet). Your job is
**explanation and remediation**: when something is slower or bigger, find out *why* and
propose a concrete fix.

## Steps

1. **Build and serve production:** `pnpm build`, then `pnpm start` (background).
   Never audit the dev server.
2. **Run lighthouse** on the routes listed in `docs/quality/lighthouse-baseline.json`
   (3 runs per route, use the median): `lighthouse <url> --output=json
   --only-categories=performance,accessibility --chrome-flags="--headless=new" --quiet`.
   Run in sandbox; extract only `performance`, `accessibility` scores and LCP/TBT/CLS.
3. **Compare vs baseline.** Budgets: perf ≥ 0.90 and within 2pts of baseline;
   LCP ≤ 2.5s; TBT ≤ 300ms; CLS ≤ 0.1; a11y ≥ 0.95.
4. **Check bundle budgets:** `pnpm perf:size`. Compare per-route sizes against
   `.size-limit.json` budgets and the previous baseline in `docs/quality/`.
5. **For every regression, attribute it:**
   - `git log --oneline <last-known-good>..HEAD -- apps/web` — which commits touched
     the regressed route or shared chunks?
   - Inspect the Next build output (route table) for first-load JS deltas; diff
     `pnpm why <pkg>` for new/upgraded dependencies.
   - Distinguish: new dependency, client-componentization of a server component,
     unoptimized image/font, layout shift from missing dimensions, blocking script.
6. **Propose fixes** ranked by impact: dynamic import / route-level code splitting,
   moving logic back to RSC, `next/image`/`next/font` adoption, dependency
   replacement or removal, caching headers.

## Report format

```markdown
# Perf Audit — <YYYY-MM-DD>

| Route | Perf | Δ vs baseline | LCP | TBT | CLS | JS size | Δ |
| ... |

## Regressions
### <route>: <metric> <value> (baseline <value>)
- Cause: <commit sha / bundle / dependency, with evidence>
- Fix: <specific change>
- Estimated effort: <S/M/L>
```

If the user asks, apply the top fix and re-measure to confirm before reporting it fixed.
After an intentional, justified change (e.g. a new feature legitimately costs JS),
propose a baseline/budget update in the same PR — never silently loosen budgets.
