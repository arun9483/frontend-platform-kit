---
name: ux-audit
description: Judgment-based UX review via Playwright MCP — routes x viewports, axe checks, heuristic checklist (layout, contrast, interaction states). Use for /ux-audit or a visual/interaction/accessibility review of the running app.
---

# UX Audit

Deterministic CI catches pixel diffs and axe violations. Your job is **judgment**:
things a pattern-matcher can't see — awkward layouts, confusing flows, broken
affordances, content that overflows at odd widths.

## Setup

- Audit the **production build** (`pnpm build && pnpm start`) unless explicitly asked
  to audit dev.
- Drive the browser with **Playwright MCP**. Save every screenshot with a
  `screenshots/` prefix (monorepo-root folder, gitignored). **Delete all PNGs after
  the review session** (`rm screenshots/*.png`).

## Matrix

Routes (default for arun-dev-platform — adjust to the repo's route map):
`/`, `/projects`, one project detail, `/articles`, one article detail (with code
blocks + ToC), `/search`, `/achievements`.

Viewports: 375×812 (mobile), 768×1024 (tablet), 1440×900 (desktop).

Themes: light + dark (`data-theme` attribute / theme toggle).

For a **preflight** run, audit only routes affected by the diff (map changed
features/components to the routes that render them) at mobile + desktop.

## Per-page checklist

1. **Layout:** no horizontal scroll at any viewport; no overlapping or clipped text;
   consistent spacing rhythm; images sized (no layout shift while loading).
2. **Typography & contrast:** readable hierarchy; body text contrast sane in both
   themes; no token violations visible (hardcoded-looking colors that ignore theme).
3. **Interaction states:** hover, focus-visible (keyboard-tab through the page),
   active, disabled. Skip-link works. Focus order matches visual order.
4. **Navigation:** active nav item highlighted; back/forward works; 404 handled.
5. **Accessibility (spot):** run an axe scan via MCP/`@axe-core/playwright`; landmarks
   present; one `h1` per page; alt text meaningful (not filename-like).
6. **Content integrity:** MDX articles — code blocks highlighted, copy button works,
   ToC anchors scroll correctly, mermaid diagrams render.
7. **Theme switch:** toggle theme on the page; no flash of wrong theme, no unstyled
   islands.

## Severity definitions

- **blocker** — broken functionality, unreadable content, or new serious/critical axe
  violation. Must fix before merge.
- **major** — clearly degraded experience (overflow, missing focus state, contrast
  fail) on a primary route. Fix this PR if touched, else file an issue.
- **minor** — polish (spacing inconsistency, awkward truncation). Batch into an issue.

## Report format

```markdown
# UX Audit — <YYYY-MM-DD> — <scope: full | preflight (routes)>

## Verdict: <pass | pass-with-issues | fail>

## Findings
### [<blocker|major|minor>] <route> @ <viewport>/<theme>: <one-line summary>
- Evidence: <what you observed; screenshot name while session is live>
- Suggested fix: <component/file + change>
```

File blockers/majors as `gh issue create --label ux-regression` if not fixed
immediately. Then delete the screenshots.
