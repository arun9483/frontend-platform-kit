# Consumer Onboarding Guide

Welcome to **frontend-platform-kit**! This guide walks you through integrating the toolkit into your project.

**Estimated time:** ~1 hour for initial setup, then 5 min per PR.

---

## Is This Toolkit for You?

### ✅ Use frontend-platform-kit if you're building:

- **React applications** (any type: admin dashboards, web apps, etc.)
- **Next.js fullstack apps** (App Router with server/client components)
- **Feature-rich web apps** (complex state, multiple domains)
- **SaaS platforms** (layered architecture with business logic)
- **Interactive dashboards** (state management-heavy)

**Key assumptions:**
- Interactive UI with complex state management
- Multiple feature domains (auth, game, settings, etc.)
- Clear separation between UI, business logic, and data access
- TypeScript for type safety
- Layered architecture (components → hooks → services → repositories)

### ❌ This toolkit is NOT suitable for:

- **NPM libraries** — No UI components, no services/repositories needed
- **CLI tools** — No React, no hooks, different architecture
- **Static sites** — No client-side state, no complex logic
- **Backend APIs** — Different layer model, no UI patterns
- **Mobile apps** — Different UI paradigm (React Native has different patterns)
- **Simple sites** (landing pages, blogs) — Overkill for minimal state

### 🤔 Partial fit (use selectively):

- **Express/Node.js APIs** — Use quality gates (lint, test, build), skip architecture patterns
- **Next.js API routes only** — Use quality gates, not the layered structure
- **Monorepos with mixed tech** — Pick what fits, skip what doesn't

---

## Quick Start (5 Minutes)

If you're experienced and just want the essentials:

```bash
# 1. Clone your repo
git clone https://github.com/<username>/<repo>.git && cd <repo>

# 2. Create .nvmrc
echo "24.0.0" > .nvmrc

# 3. Install everything
pnpm add -D typescript@5.9.3 eslint@9.39.4 prettier@3.8.1 husky@9.1.7 \
  lint-staged@16.4.0 @commitlint/cli@20.5.0 @commitlint/config-conventional@20.5.0 \
  jscpd@5.0.8 knip@6.16.1 vitest @playwright/test @testing-library/react \
  gitleaks size-limit @arun-dev/eslint-config @arun-dev/ts-config && \
  pnpm add next@16.2.0 react@19.0.0 react-dom@19.0.0

# 4. Copy configs from this repo
# - tsconfig.json, .eslintrc.json, .prettierrc.json, knip.json, .jscpd.json, .commitlintrc.json

# 5. Setup Husky & add .github/workflows/ci.yml (see Phase 6 & 7)
pnpm husky install

# 6. Push & let CI record baselines
git push origin main
```

**Continue with:** [Full Setup](#phase-1-prerequisites-checklist)

---

## Phase 1: Prerequisites

- [ ] **Node.js 24.0.0+** — Check with `node --version`
- [ ] **pnpm 10.32.1+** — Check with `pnpm --version`
- [ ] **GitHub repository** — Created and cloned locally
- [ ] **Git configured** — `git config --global user.name` and `user.email` set

**Install Node & pnpm (if needed):**

```bash
# Using nvm (recommended)
nvm install 24.0.0 && nvm use 24.0.0

# Using Homebrew (macOS)
brew install node@24 && brew install pnpm

# Using apt (Ubuntu/Debian)
sudo apt install nodejs npm && npm install -g pnpm
```

Verify: `node --version && pnpm --version`

---

## Phase 2: Create Repository & .nvmrc

1. Go to [github.com/new](https://github.com/new) and create repo (add `.gitignore` Node, `README.md`)
2. Clone locally: `git clone https://github.com/<username>/<repo>.git && cd <repo>`
3. Create `.nvmrc`: `echo "24.0.0" > .nvmrc`
4. Verify: `nvm use`  # Should say "Now using node v24.0.0"

---

## Phase 3: Install Dependencies & Configure package.json

### Initialize package.json

```bash
pnpm init
```

Add to `package.json`:

```json
{
  "packageManager": "pnpm@10.32.1",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.32.1"
  }
}
```

### Install All Dependencies

```bash
# Core tools (required by toolkit)
pnpm add -D typescript@5.9.3 eslint@9.39.4 prettier@3.8.1 husky@9.1.7 \
  lint-staged@16.4.0 @commitlint/cli@20.5.0 @commitlint/config-conventional@20.5.0 \
  jscpd@5.0.8 knip@6.16.1

# Shared config packages
pnpm add -D @arun-dev/eslint-config @arun-dev/ts-config

# Testing
pnpm add -D vitest @vitest/ui @playwright/test @testing-library/react

# Quality & Security
pnpm add -D size-limit gitleaks

# Framework (choose one)
# Next.js:
pnpm add next@16.2.0 react@19.0.0 react-dom@19.0.0 && pnpm add -D @types/react @types/node
# Or plain React + Vite:
# pnpm add react@19.0.0 react-dom@19.0.0 vite@7.3.0 && pnpm add -D @vitejs/plugin-react @types/react @types/node
```

Verify: `pnpm list | head -20`

---

## Phase 4: Configuration Files

Create these files in project root. Each enables a quality gate.

**tsconfig.json:**
```json
{
  "extends": "@arun-dev/ts-config",
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "app/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "build", ".next"]
}
```

**.eslintrc.json:**
```json
{
  "extends": ["@arun-dev/eslint-config"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

**.prettierrc.json:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**knip.json:**
```json
{
  "project": ["src/**/*.ts", "src/**/*.tsx", "app/**/*.ts", "app/**/*.tsx"],
  "ignore": ["**/*.spec.ts", "**/*.spec.tsx", "dist", "build", ".next"]
}
```

**.jscpd.json:**
```json
{
  "threshold": 5,
  "minTokens": 25,
  "reporters": ["json", "html"],
  "ignore": ["node_modules", "dist", "build", ".next", "tests"]
}
```

**.commitlintrc.json:**
```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

---

## Phase 5: Add Scripts to package.json

Add `scripts` section to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:unit": "vitest --run",
    "build": "next build",
    "dev": "next dev",
    "test:e2e": "playwright test",
    "perf:size": "size-limit",
    "quality:knip": "knip",
    "quality:dupes": "jscpd src app",
    "prepare": "husky"
  }
}
```

**When each script runs:**
- `lint`, `format:check`, `typecheck`, `test` → Pre-commit/push (Husky)
- `build`, `test:e2e`, `perf:size`, `quality:knip`, `quality:dupes` → CI (GitHub Actions)

---

## Phase 6: Setup Git Hooks with Husky

```bash
pnpm husky install
```

**Create .husky/pre-commit:**
```bash
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
pnpm lint-staged
gitleaks protect --staged
EOF
chmod +x .husky/pre-commit
```

**Create .husky/pre-push:**
```bash
cat > .husky/pre-push << 'EOF'
#!/bin/sh
pnpm typecheck
pnpm test
echo "💡 Tip: Run /preflight before opening a PR"
EOF
chmod +x .husky/pre-push
```

**Create .lintstagedrc.json:**
```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"],
  "*.{ts,tsx}": ["tsc --noEmit --skipLibCheck"]
}
```

**Test it:**
```bash
echo "const x  =   1" > test-file.ts
git add test-file.ts
git commit -m "test"
# Should fail with ESLint error ✓
rm test-file.ts && git reset HEAD test-file.ts
```

---

## Phase 7: GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

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

**Always use `@v1` (never `@main`).** The `@v1` tag moves to latest v1.x.y automatically.

**Optional: Set branch protection**
- Go to **Settings → Branches → Add branch protection rule**
- Require: `main`
- Require status checks: `quality`, `security`, `performance`, `ux`

---

## Phase 8: Claude Code Plugin

In Claude Code terminal:
```bash
/plugin marketplace add arun9483/frontend-platform-kit
```

Available skills:
- **`/preflight`** — Run before opening a PR (checks code health, deps, performance)
- **`/security-audit`** — Deep security review
- **`/perf-audit`** — Performance optimization suggestions
- **`/ux-audit`** — Accessibility & UX review
- **`/quality-audit`** — Code quality deep dive
- **`/deps-modernize`** — Safe dependency upgrades

---

## Phase 9: Project Structure

```
src/
  features/
    game/
      components/          # UI only
        Board.tsx
        Board.module.css
      services/            # Business logic
        gameLogic.ts
        gameLogic.unit.spec.ts
      hooks/               # State orchestration
        useGame.ts
      types/
        game.ts
  components/              # Shared UI
  lib/                     # Utilities
  styles/
  tests/
    setup.ts
    e2e/

app/                       # Next.js App Router
.github/workflows/ci.yml
docs/quality/              # Baselines
```

**Rules:**
- No cross-feature imports (game feature ≠ auth feature)
- No business logic in components
- All data access through services
- E2E tests in dedicated `tests/e2e/` folder

---

## Phase 10: Create Your First Feature (Tic-Tac-Toe Example)

### Types
Create `src/features/game/types/game.ts`:
```typescript
export type GameStatus = 'playing' | 'won' | 'draw';
export type Player = 'X' | 'O';

export interface GameState {
  board: (Player | null)[];
  currentPlayer: Player;
  status: GameStatus;
}
```

### Business Logic (Service)
Create `src/features/game/services/gameLogic.ts`:
```typescript
import { GameState, Player } from '../types/game';

export function initializeGame(): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    status: 'playing',
  };
}

export function makeMove(state: GameState, index: number): GameState {
  if (state.board[index] !== null || state.status !== 'playing') {
    return state;
  }
  const newBoard = [...state.board];
  newBoard[index] = state.currentPlayer;
  return {
    board: newBoard,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    status: checkStatus(newBoard),
  };
}

function checkStatus(board: (Player | null)[]): GameStatus {
  const winner = checkWinner(board);
  if (winner) return 'won';
  if (board.every((c) => c !== null)) return 'draw';
  return 'playing';
}

function checkWinner(board: (Player | null)[]): Player | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
```

### Unit Tests
Create `src/features/game/services/gameLogic.unit.spec.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { makeMove } from './gameLogic';

describe('gameLogic', () => {
  it('places piece in empty cell', () => {
    const state = { board: Array(9).fill(null), currentPlayer: 'X', status: 'playing' };
    const next = makeMove(state, 0);
    expect(next.board[0]).toBe('X');
  });

  it('detects winner', () => {
    const state = { board: Array(9).fill(null), currentPlayer: 'X', status: 'playing' };
    let s = state;
    s = makeMove(s, 0); // X at 0
    s = makeMove(s, 3); // O at 3
    s = makeMove(s, 1); // X at 1
    s = makeMove(s, 4); // O at 4
    s = makeMove(s, 2); // X at 2 (wins)
    expect(s.status).toBe('won');
  });
});
```

Run: `pnpm test`

### React Hook
Create `src/features/game/hooks/useGame.ts`:
```typescript
import { useState } from 'react';
import { GameState } from '../types/game';
import { initializeGame, makeMove } from '../services/gameLogic';

export function useGame() {
  const [state, setState] = useState<GameState>(initializeGame());

  return {
    state,
    handleMove: (index: number) => setState((s) => makeMove(s, index)),
    handleReset: () => setState(initializeGame()),
  };
}
```

### React Component
Create `src/features/game/components/Board.tsx`:
```typescript
import { useGame } from '../hooks/useGame';
import styles from './Board.module.css';

export function Board() {
  const { state, handleMove, handleReset } = useGame();

  return (
    <div className={styles.container}>
      <h1>Tic-Tac-Toe</h1>
      <div className={styles.board}>
        {state.board.map((cell, i) => (
          <button
            key={i}
            className={styles.cell}
            onClick={() => handleMove(i)}
            disabled={cell !== null || state.status !== 'playing'}
          >
            {cell}
          </button>
        ))}
      </div>
      <div className={styles.status}>
        {state.status === 'playing' && <p>Current: {state.currentPlayer}</p>}
        {state.status === 'won' && <p>Player {state.currentPlayer} wins!</p>}
        {state.status === 'draw' && <p>Draw!</p>}
      </div>
      <button onClick={handleReset}>New Game</button>
    </div>
  );
}
```

Create `src/features/game/components/Board.module.css`:
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  gap: 0.5rem;
}

.cell {
  width: 100px;
  height: 100px;
  font-size: 2rem;
  font-weight: bold;
  border: 2px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 0.5rem;
}

.cell:hover:not(:disabled) {
  background: #f3f4f6;
}

.cell:disabled {
  cursor: not-allowed;
}

.status {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 1rem 0;
}
```

### Commit
```bash
git add src/features/game
git commit -m "feat: add tic-tac-toe game"
git push origin main
```

---

## Phase 11: Record Baselines

### Trigger First CI Run
```bash
git checkout -b docs/readme
echo "# My App" >> README.md
git add README.md && git commit -m "docs: add readme" && git push -u origin docs/readme
```

Create PR on GitHub. **Wait for CI.** The `performance.yml` auto-generates:
- `docs/quality/lighthouse-baseline.json` ✅

### Create Baseline Summary
Create `docs/quality/baselines-2026-07-26.md`:

```markdown
# Baselines - 2026-07-26

Initial baselines recorded.

## Lighthouse
- Performance: 96
- Accessibility: 100
- Best Practices: 100

## Core Web Vitals
- LCP: 2.5s
- TBT: 80ms
- CLS: 0

## Bundle Size
- Main: ~150KB
```

### Commit Baselines
```bash
git add docs/quality/
git commit -m "docs: record initial baselines"
git push
```

Merge PR. Baselines now locked on `main`.

---

## Phase 12: Development Workflow

**For each feature:**

1. Create branch: `git checkout -b feature/my-feature`
2. Write code + tests: `pnpm test` (runs locally)
3. Push: `git push origin feature/my-feature`
4. Husky pre-push runs: typecheck + tests
5. Run `/preflight` in Claude Code
6. Open PR on GitHub
7. Wait for CI (quality, security, performance, ux)
8. Fix any failures, push again
9. Get reviewed & merge

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "pnpm: command not found" | `npm install -g pnpm@10.32.1` |
| "@arun-dev/eslint-config not found" | `pnpm add -D @arun-dev/eslint-config @arun-dev/ts-config` |
| "Pre-push hook failed: typecheck" | `pnpm typecheck` to see errors and fix them |
| "Husky: husky not installed" | `pnpm husky install` |
| "CI failed but no error details" | Check GitHub repo → Actions tab, expand job, read output |
| ".size-limit.json not found" | Optional file. Delete `perf:size` script if not needed |

---

## Opinionated by Design

This toolkit makes specific choices because they enable **reliable quality gates** and **predictable behavior**:

| Choice | Why Opinionated | Alternative |
|--------|-----------------|-------------|
| **pnpm only** | Frozen lockfile guarantee + fast caching | npm (flaky), yarn (medium) |
| **Next.js** | Standardized build/start commands | React+Vite (different setup) |
| **TypeScript strict mode** | Catch bugs at compile time | JavaScript (runtime errors) |
| **Layered architecture** | Clear separation of concerns | Monolithic components |
| **Feature-based folders** | Scales well, easy to delete features | File-type folders (hard to scale) |
| **.nvmrc for Node version** | Reproducible builds across machines | Any Node version (breaks CI) |

**Philosophy:** Better to be opinionated and predictable than agnostic and fragile.

If these choices don't fit your project, that's a signal the toolkit may not be the right fit.

---

## Reference

### Required npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | 5.9.3 | Type safety |
| eslint | 9.39.4 | Linting |
| prettier | 3.8.1 | Formatting |
| husky | 9.1.7 | Git hooks |
| lint-staged | 16.4.0 | Run on staged files |
| @commitlint/cli | 20.5.0 | Commit validation |
| vitest | latest | Unit testing |
| @playwright/test | latest | E2E testing |
| size-limit | 11.1.2 | Bundle size tracking |
| knip | 6.16.1 | Unused code |
| jscpd | 5.0.8 | Duplicate code |
| gitleaks | 8.21.0 | Secret detection |
| @arun-dev/eslint-config | latest | Shared ESLint rules |
| @arun-dev/ts-config | latest | Shared TypeScript config |

### CI Workflows

- **quality.yml** → ESLint, TypeScript, Vitest, Knip, JSCPD
- **security.yml** → osv-scanner (dependencies), gitleaks (secrets)
- **performance.yml** → Lighthouse (performance/a11y), size-limit (bundle)
- **ux.yml** → Playwright (E2E), axe (accessibility), visual snapshots

### When to Use Claude Code Skills

- **Before PR:** `/preflight` (quick health check)
- **On security concerns:** `/security-audit`
- **On performance issues:** `/perf-audit`
- **On accessibility:** `/ux-audit`
- **On architecture:** `/quality-audit`
- **On outdated deps:** `/deps-modernize`

---

**Ready to start? Begin with [Phase 1](#phase-1-prerequisites).**

For questions: Check GitHub issues or run `/preflight` in Claude Code.
