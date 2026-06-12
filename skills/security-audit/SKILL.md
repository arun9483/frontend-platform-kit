---
name: security-audit
description: Triage dependency vulnerabilities (osv-scanner) and secrets (gitleaks) with real-exploitability analysis, propose pinned fixes, and file labeled GitHub issues. Use for /security-audit or any dependency/secret security review.
---

# Security Audit

You are auditing a pnpm monorepo. CI already blocks high+ CVSS findings and committed
secrets deterministically; your job is **triage and judgment** — osv-scanner has no
reachability analysis, so you compensate by checking whether vulnerable code paths are
actually used.

## Steps

1. **Scan dependencies:** `osv-scanner scan source --lockfile=pnpm-lock.yaml --format json`
   (run in sandbox; do not dump raw JSON into the conversation). If `osv-scanner.toml`
   exists, review every ignore entry: flag any without justification + owner + expiry,
   and any past its expiry date.
2. **Scan for secrets:** `gitleaks detect --source . --redact --no-banner`. Also run
   `gitleaks protect --staged --redact` if there are staged changes.
3. **Triage each dependency finding:**
   - Identify the vulnerable function/behavior from the advisory (use Context7 or the
     OSV/GHSA advisory text).
   - Grep the codebase: is the package imported directly? Is the vulnerable API
     reachable from app code, or is it a dev-only / build-time dependency?
   - Classify: **exploitable** (reachable in production code), **latent** (installed
     but vulnerable path unused), **dev-only** (test/build tooling).
4. **Propose fixes**, in order of preference: exact pinned version bump (repo convention:
   no `^`/`~`), pnpm `overrides` for transitive deps, or a justified `osv-scanner.toml`
   ignore with owner + expiry ≤ 90 days (never permanent).
5. **Report and file issues.**

## Severity policy

| Level | Criteria | Action |
| --- | --- | --- |
| critical | CVSS ≥ 9 or any exploitable finding in production code, or any real secret in history | Fix now; issue `sev:critical`; 24h SLA |
| high | CVSS 7–8.9 reachable, or critical-CVSS but latent | Fix this week; issue `sev:high`; 7d SLA |
| medium | CVSS 4–6.9 latent, or dev-only high | Issue `sev:medium`; monthly triage |
| low | Everything else | Mention in report only |

A secret found in git history is always critical even if revoked-looking — rotation
must be verified, and history rewrite considered.

## Report format

```markdown
# Security Audit — <YYYY-MM-DD>

## Summary
<1–3 sentences: counts by severity, overall posture>

## Dependency findings
### <package>@<version> — <OSV/GHSA ids> — sev:<level>
- Advisory: <one-line description>
- Exploitability: <exploitable|latent|dev-only> — <evidence: file:line where used, or "not imported">
- Fix: <exact pinned bump / override / waiver proposal>

## Secrets
<findings with redacted values, or "none">

## Waiver review
<expired/unjustified osv-scanner.toml entries, or "clean">
```

## Issue filing

For every high/critical finding (one issue per package):

```
gh issue create \
  --title "security: <package>@<version> — <GHSA-id> (sev:<level>)" \
  --label "sev:<level>" \
  --body "<the finding's report section, including exploitability evidence and proposed fix>"
```

Create the label first if needed: `gh label create "sev:<level>" --force`. Check for an
existing open issue for the same advisory before filing (`gh issue list --search`) —
update it instead of duplicating.
