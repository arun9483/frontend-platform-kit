// Turns osv-scanner JSON into a severity-complete report.
//
// Reports EVERY finding at EVERY severity to the run summary — consumers decide
// which severities to act on via fail-at. Silence here means "the scan found
// nothing", never "nothing crossed a threshold".
//
// Each row also carries an upgrade path: not "the version that clears this
// advisory", but the nearest version that no known advisory affects. Those differ,
// and the difference is what rots pinned `pnpm.overrides` over time — an advisory
// is immutable, so it keeps naming a fix version long after that version has
// itself been found vulnerable. The path is walked one advisory at a time and
// superseded hops are struck through, so the trail stays readable rather than
// collapsing into a single number.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';

const resultsPath = process.env.OSV_RESULTS ?? 'osv-results.json';
const summaryPath = process.env.OSV_SUMMARY ?? 'osv-summary.md';
const failAt = process.env.OSV_FAIL_AT ? Number(process.env.OSV_FAIL_AT) : null;
const osvApi = process.env.OSV_API ?? 'https://api.osv.dev/v1/query';
// Set when the walk must stay offline (tests, air-gapped runners). Rows then fall
// back to the fix named by the advisory itself, flagged as unverified.
const offline = /^(1|true)$/i.test(process.env.OSV_OFFLINE ?? '');
const apiTimeoutMs = Number(process.env.OSV_API_TIMEOUT_MS ?? 10000);
const MAX_HOPS = 16;

const band = (score) =>
  score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';

// Minimal semver precedence — the report must not pull a dependency into the action.
const parseVersion = (value) => {
  const raw = String(value).trim().replace(/^v/, '');
  const noBuild = raw.split('+', 1)[0];
  const dash = noBuild.indexOf('-');
  const core = dash === -1 ? noBuild : noBuild.slice(0, dash);
  const pre = dash === -1 ? '' : noBuild.slice(dash + 1);
  const [major, minor, patch] = core.split('.').map((n) => Number.parseInt(n, 10) || 0);
  return { nums: [major || 0, minor || 0, patch || 0], pre };
};

const compareVersions = (a, b) => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (left.nums[i] !== right.nums[i]) return left.nums[i] < right.nums[i] ? -1 : 1;
  }
  if (left.pre === right.pre) return 0;
  if (!left.pre) return 1; // a release outranks any prerelease of the same core
  if (!right.pre) return -1;
  const li = left.pre.split('.');
  const ri = right.pre.split('.');
  for (let i = 0; i < Math.max(li.length, ri.length); i += 1) {
    const x = li[i];
    const y = ri[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
    } else if (xNum !== yNum) {
      return xNum ? -1 : 1; // numeric identifiers sort below alphanumeric ones
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
};

// Does `version` fall inside this advisory's affected ranges, and if so what release
// closes the range it landed in? `last_affected` marks an affected range whose fix
// version the advisory never states — affected, but with no target to jump to.
const rangeVerdict = (version, affectedEntry) => {
  for (const range of affectedEntry.ranges ?? []) {
    if (range.type === 'GIT') continue;
    let introduced = null;
    for (const event of range.events ?? []) {
      if (event.introduced !== undefined) {
        introduced = event.introduced === '0' ? '0.0.0' : event.introduced;
      } else if (event.fixed !== undefined) {
        if (
          introduced !== null &&
          compareVersions(version, introduced) >= 0 &&
          compareVersions(version, event.fixed) < 0
        ) {
          return { hit: true, fixed: event.fixed };
        }
        introduced = null;
      } else if (event.last_affected !== undefined) {
        if (
          introduced !== null &&
          compareVersions(version, introduced) >= 0 &&
          compareVersions(version, event.last_affected) <= 0
        ) {
          return { hit: true, fixed: null };
        }
        introduced = null;
      }
    }
    // An `introduced` with no closing event affects everything from there on.
    if (introduced !== null && compareVersions(version, introduced) >= 0) {
      return { hit: true, fixed: null };
    }
  }
  return { hit: false, fixed: null };
};

// Every advisory OSV knows for a package, not just the ones matching the installed
// version — the walk needs to see advisories that only bite *after* the first hop.
const advisoryCache = new Map();
const fetchAdvisories = async (name) => {
  if (advisoryCache.has(name)) return advisoryCache.get(name);
  const signal = AbortSignal.timeout(apiTimeoutMs);
  const response = await fetch(osvApi, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ package: { name, ecosystem: 'npm' } }),
    signal,
  });
  if (!response.ok) throw new Error(`OSV responded ${response.status}`);
  const payload = await response.json();
  const advisories = (payload.vulns ?? []).filter((v) => !v.withdrawn);
  advisoryCache.set(name, advisories);
  return advisories;
};

const advisoriesHitting = (advisories, name, version) => {
  const hits = [];
  for (const advisory of advisories) {
    let verdict = null;
    for (const affected of advisory.affected ?? []) {
      if (affected.package?.name && affected.package.name !== name) continue;
      const result = rangeVerdict(version, affected);
      if (!result.hit) continue;
      // Prefer the range that names a fix over one that does not.
      if (!verdict || (verdict.fixed === null && result.fixed !== null)) verdict = result;
    }
    if (verdict) hits.push({ id: advisory.id, fixed: verdict.fixed });
  }
  return hits;
};

// Walk one advisory at a time, always taking the *nearest* fix rather than jumping
// straight to the furthest. Both converge on the same endpoint, but stepping shows
// which intermediate versions were considered and superseded — that trail is the
// point. Each hop strictly increases the version, so the walk terminates.
const remediationPath = async (name, version, localFallbackFix) => {
  if (offline) {
    return { hops: [], safe: localFallbackFix, verified: false, note: 'offline' };
  }
  let advisories;
  try {
    advisories = await fetchAdvisories(name);
  } catch (error) {
    return {
      hops: [],
      safe: localFallbackFix,
      verified: false,
      note: `OSV lookup failed (${error.message})`,
    };
  }

  const major = parseVersion(version).nums[0];
  const hops = [];
  let current = version;

  for (let i = 0; i < MAX_HOPS; i += 1) {
    const hits = advisoriesHitting(advisories, name, current);
    if (!hits.length) return { hops, safe: current, verified: true };

    const fixable = hits.filter((h) => h.fixed !== null);
    if (!fixable.length) {
      return {
        hops,
        safe: null,
        verified: true,
        note: `no published fix for ${hits.map((h) => h.id).join(', ')}`,
      };
    }

    const next = fixable.reduce((a, b) => (compareVersions(b.fixed, a.fixed) < 0 ? b : a));
    if (parseVersion(next.fixed).nums[0] !== major) {
      return {
        hops,
        safe: next.fixed,
        verified: true,
        note: 'requires a major upgrade',
        crossesMajor: true,
      };
    }
    hops.push({ from: current, to: next.fixed, ids: fixable.filter((h) => h.fixed === next.fixed).map((h) => h.id) });
    current = next.fixed;

    const unfixed = hits.filter((h) => h.fixed === null);
    if (unfixed.length && i === 0) {
      // Some advisory on the installed version names no fix at all; the walk can
      // still improve matters but cannot claim a clean endpoint.
      return {
        hops,
        safe: current,
        verified: true,
        note: `partial — no published fix for ${unfixed.map((h) => h.id).join(', ')}`,
      };
    }
  }
  return { hops, safe: current, verified: true, note: 'hop limit reached' };
};

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

// The fix the scan's own advisory data names — used only when the OSV walk is
// unavailable, since it is exactly the value that goes stale.
const localFix = (ids, vulnsById, name, version) => {
  let best = null;
  for (const id of ids) {
    const advisory = vulnsById.get(id);
    if (!advisory) continue;
    for (const affected of advisory.affected ?? []) {
      if (affected.package?.name && affected.package.name !== name) continue;
      const verdict = rangeVerdict(version, affected);
      if (verdict.hit && verdict.fixed && (best === null || compareVersions(verdict.fixed, best) > 0)) {
        best = verdict.fixed;
      }
    }
  }
  return best;
};

const findings = [];
for (const result of data.results ?? []) {
  const source = result.source?.path ?? '';
  for (const pkg of result.packages ?? []) {
    const name = pkg.package?.name ?? '(unknown)';
    const version = pkg.package?.version ?? '(unknown)';

    // osv-scanner keys advisories by id, but groups reference them by id *or* alias.
    const vulnsById = new Map();
    for (const advisory of pkg.vulnerabilities ?? []) {
      vulnsById.set(advisory.id, advisory);
      for (const alias of advisory.aliases ?? []) vulnsById.set(alias, advisory);
    }

    for (const group of pkg.groups ?? []) {
      const score = Number(group.max_severity || 0);
      const ids = group.ids ?? [];
      findings.push({
        name,
        version,
        score,
        band: band(score),
        ids,
        path: await remediationPath(name, version, localFix(ids, vulnsById, name, version)),
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

const advisoryLink = (id) =>
  id.startsWith('GHSA-')
    ? `[${id}](https://github.com/advisories/${id})`
    : `[${id}](https://osv.dev/vulnerability/${id})`;

// Superseded hops are struck through and keep the advisory that superseded them, so
// the row reads as a trail: this advisory said 3.3.16, but 3.3.16 was then found
// vulnerable by that advisory, which is why the answer is 3.3.18.
const pathCell = ({ hops, safe, verified, note, crossesMajor }) => {
  if (!safe && !hops.length) return note ? `no fix — ${note}` : 'no fix yet';

  // A single hop needs no advisory annotation: the Advisories column already names
  // it. Annotate only when the walk had to step over a superseded version, since
  // there the advisory ids are the explanation for why the first target was wrong.
  const annotate = hops.length > 1;
  const parts = hops.map((hop, i) => {
    const last = i === hops.length - 1 && !crossesMajor;
    const ids = annotate ? ` (${hop.ids.map(advisoryLink).join(', ')})` : '';
    return last ? `**\`${hop.to}\`**${ids}` : `~~\`${hop.to}\`~~${ids}`;
  });
  if (crossesMajor && safe) parts.push(`**\`${safe}\`** — major upgrade`);
  if (!parts.length && safe) parts.push(`**\`${safe}\`**`); // offline fallback: no walk, just a target

  let cell = parts.join(' → ');
  if (!verified) cell += ' ⚠️ unverified';
  if (note && !crossesMajor) cell += ` — _${note}_`;
  return cell;
};

const rows = findings.map(
  (f) =>
    `| \`${f.name}@${f.version}\` | ${f.score || '—'} | ${f.band} | ${pathCell(f.path)} | ${f.ids
      .map(advisoryLink)
      .join(', ')} |`,
);

const unresolved = findings.filter((f) => !f.path.safe).length;
const unverified = findings.filter((f) => !f.path.verified).length;

const breakdown = Object.entries(counts)
  .filter(([, n]) => n > 0)
  .map(([k, n]) => `${n} ${k}`)
  .join(', ');

const notes = [
  '_**Upgrade path** walks from the installed version to the nearest release no known_',
  '_advisory affects. A ~~struck~~ hop is a version an advisory named as its fix that was_',
  '_later found vulnerable itself — follow the arrow to the version that still holds._',
];
if (unresolved) {
  notes.push(`_${unresolved} finding(s) have no published fix; those need a waiver with owner + expiry._`);
}
if (unverified) {
  notes.push(`_${unverified} row(s) could not be checked against OSV and show the advisory's own fix — treat as a floor, not a guarantee._`);
}

const report = findings.length
  ? [
      `**${findings.length} vulnerable package(s)** — ${breakdown}.`,
      '',
      '| Package | CVSS | Severity | Upgrade path | Advisories |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
      ...notes,
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
      const target = o.path.safe ? ` → upgrade to ${o.path.safe}` : ' → no fix published';
      console.error(`  - ${o.name}@${o.version}${target} (CVSS ${o.score}: ${o.ids.join(', ')})`);
    }
    process.exit(1);
  }
  console.log(`No vulnerabilities at or above CVSS ${failAt}.`);
}
