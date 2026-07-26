// Turns osv-scanner JSON into a severity-complete report.
//
// Reports EVERY finding at EVERY severity to the run summary — consumers decide
// which severities to act on via fail-at. Silence here means "the scan found
// nothing", never "nothing crossed a threshold".

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';

const resultsPath = process.env.OSV_RESULTS ?? 'osv-results.json';
const summaryPath = process.env.OSV_SUMMARY ?? 'osv-summary.md';
const failAt = process.env.OSV_FAIL_AT ? Number(process.env.OSV_FAIL_AT) : null;

const band = (score) =>
  score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';

if (!existsSync(resultsPath)) {
  // A missing file means the scan step never produced output — treat it as a
  // hard failure rather than an all-clear.
  console.error(`::error::${resultsPath} not found — osv-scanner produced no output.`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(resultsPath, 'utf8'));
} catch (error) {
  console.error(`::error::${resultsPath} is not valid JSON: ${error.message}`);
  process.exit(1);
}

const findings = [];
for (const result of data.results ?? []) {
  const source = result.source?.path ?? '';
  for (const pkg of result.packages ?? []) {
    for (const group of pkg.groups ?? []) {
      const score = Number(group.max_severity || 0);
      findings.push({
        name: pkg.package?.name ?? '(unknown)',
        version: pkg.package?.version ?? '(unknown)',
        score,
        band: band(score),
        ids: group.ids ?? [],
        source,
      });
    }
  }
}

findings.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

const counts = { critical: 0, high: 0, medium: 0, low: 0 };
for (const f of findings) counts[f.band] += 1;
const maxScore = findings.reduce((m, f) => Math.max(m, f.score), 0);
const level = findings.length === 0 ? 'none' : band(maxScore);

const rows = findings.map(
  (f) =>
    `| \`${f.name}@${f.version}\` | ${f.score || '—'} | ${f.band} | ${f.ids.join(', ')} |`,
);

const breakdown = Object.entries(counts)
  .filter(([, n]) => n > 0)
  .map(([k, n]) => `${n} ${k}`)
  .join(', ');

const report = findings.length
  ? [
      `**${findings.length} vulnerable package(s)** — ${breakdown}.`,
      '',
      '| Package | CVSS | Severity | Advisories |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      failAt === null
        ? '_All severities listed; this scan does not gate._'
        : `_Gate fails at CVSS >= ${failAt}; lower severities are reported for awareness._`,
    ].join('\n')
  : 'No known vulnerabilities at any severity.';

writeFileSync(summaryPath, report + '\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Dependency vulnerabilities\n\n${report}\n`);
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `count=${findings.length}\nlevel=${level}\nmax-severity=${maxScore}\nsummary-file=${summaryPath}\n`,
  );
}

console.log(report);

if (failAt !== null) {
  const offenders = findings.filter((f) => f.score >= failAt);
  if (offenders.length) {
    console.error(`::error::${offenders.length} vulnerability(ies) at or above CVSS ${failAt}`);
    for (const o of offenders) {
      console.error(`  - ${o.name}@${o.version} (CVSS ${o.score}: ${o.ids.join(', ')})`);
    }
    process.exit(1);
  }
  console.log(`No vulnerabilities at or above CVSS ${failAt}.`);
}
