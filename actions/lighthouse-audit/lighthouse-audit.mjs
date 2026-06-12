// Deterministic lighthouse budget check (CI layer — no AI here).
// Median of N runs per route:
//   - Ratchet vs committed baseline (FAILS): perf within 2pts, metrics within
//     10% (+CLS +0.02). "Never worse than baseline" is the gate from day one.
//   - Absolute targets (WARNS only): perf >= 0.90, a11y >= 0.95, LCP <= 2500ms,
//     TBT <= 300ms, CLS <= 0.1 — the quarterly tightening direction, surfaced
//     in the summary but never an absolute gate on day one.
// Record mode: if the baseline file is missing, write it and exit 0.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';

const routes = (process.env.ROUTES ?? '/').split(',').map((r) => r.trim()).filter(Boolean);
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const baselinePath = process.env.BASELINE_PATH ?? 'docs/quality/lighthouse-baseline.json';
const runs = Number(process.env.RUNS ?? '3');

const CAPS = { performance: 0.9, accessibility: 0.95, lcpMs: 2500, tbtMs: 300, cls: 0.1 };
const RATCHET = { scoreDelta: 0.02, metricRatio: 1.1, clsDelta: 0.02 };

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function runLighthouse(url, attempt) {
  const out = `${tmpdir()}/lh-${Buffer.from(url).toString('hex').slice(0, 16)}-${attempt}.json`;
  execFileSync(
    'lighthouse',
    [
      url,
      '--output=json',
      `--output-path=${out}`,
      '--only-categories=performance,accessibility',
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      '--quiet',
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  const report = JSON.parse(readFileSync(out, 'utf8'));
  return {
    performance: report.categories.performance.score,
    accessibility: report.categories.accessibility.score,
    lcpMs: report.audits['largest-contentful-paint'].numericValue,
    tbtMs: report.audits['total-blocking-time'].numericValue,
    cls: report.audits['cumulative-layout-shift'].numericValue,
  };
}

const results = {};
for (const route of routes) {
  const url = new URL(route, baseUrl).href;
  console.log(`\n=== ${route} (${runs} runs) ===`);
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push(runLighthouse(url, i));
  results[route] = {
    performance: median(samples.map((s) => s.performance)),
    accessibility: median(samples.map((s) => s.accessibility)),
    lcpMs: Math.round(median(samples.map((s) => s.lcpMs))),
    tbtMs: Math.round(median(samples.map((s) => s.tbtMs))),
    cls: Number(median(samples.map((s) => s.cls)).toFixed(4)),
  };
  console.log(JSON.stringify(results[route]));
}

if (!existsSync(baselinePath)) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(
    baselinePath,
    JSON.stringify(
      { capturedAt: new Date().toISOString().slice(0, 10), routes: results },
      null,
      2,
    ) + '\n',
  );
  console.log(`\nNo baseline found — recorded new baseline at ${baselinePath}. Commit it.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const failures = [];
const warnings = [];
const rows = [];

for (const [route, m] of Object.entries(results)) {
  const b = baseline.routes?.[route];
  const fail = (msg) => failures.push(`${route}: ${msg}`);
  const warn = (msg) => warnings.push(`${route}: ${msg}`);

  if (m.performance < CAPS.performance) warn(`perf ${m.performance} < target ${CAPS.performance}`);
  if (m.accessibility < CAPS.accessibility)
    warn(`a11y ${m.accessibility} < target ${CAPS.accessibility}`);
  if (m.lcpMs > CAPS.lcpMs) warn(`LCP ${m.lcpMs}ms > target ${CAPS.lcpMs}ms`);
  if (m.tbtMs > CAPS.tbtMs) warn(`TBT ${m.tbtMs}ms > target ${CAPS.tbtMs}ms`);
  if (m.cls > CAPS.cls) warn(`CLS ${m.cls} > target ${CAPS.cls}`);

  if (b) {
    if (m.performance < b.performance - RATCHET.scoreDelta)
      fail(`perf ${m.performance} regressed vs baseline ${b.performance}`);
    if (m.lcpMs > b.lcpMs * RATCHET.metricRatio)
      fail(`LCP ${m.lcpMs}ms regressed vs baseline ${b.lcpMs}ms`);
    if (m.tbtMs > Math.max(b.tbtMs * RATCHET.metricRatio, b.tbtMs + 50))
      fail(`TBT ${m.tbtMs}ms regressed vs baseline ${b.tbtMs}ms`);
    if (m.cls > b.cls + RATCHET.clsDelta) fail(`CLS ${m.cls} regressed vs baseline ${b.cls}`);
  } else {
    fail(`no baseline entry — add ${route} to ${baselinePath}`);
  }

  rows.push(
    `| ${route} | ${m.performance} | ${m.accessibility} | ${m.lcpMs} | ${m.tbtMs} | ${m.cls} |`,
  );
}

const summary = [
  '## Lighthouse (median of ' + runs + ' runs)',
  '',
  '| Route | Perf | A11y | LCP (ms) | TBT (ms) | CLS |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
  failures.length
    ? `**${failures.length} baseline regression(s):**`
    : '**No regressions vs baseline.**',
  ...failures.map((f) => `- ${f}`),
  ...(warnings.length
    ? ['', `**${warnings.length} absolute-target warning(s) (non-blocking):**`]
    : []),
  ...warnings.map((w) => `- ${w}`),
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
console.log('\n' + summary);
process.exit(failures.length ? 1 : 0);
