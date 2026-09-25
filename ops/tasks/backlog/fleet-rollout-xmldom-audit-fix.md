---
assigned_role: human-triage
created: 2026-09-25
source: principal-engineer
---

## Pattern

Sites using `pixi.js@8.x` carry `@xmldom/xmldom <= 0.8.14` as a transitive production
dependency. On 2026-09-25 the npm advisory DB listed 10 high-severity CVEs against that
range, causing `npm audit --omit=dev --audit-level=high` (the `security:audit:prod` gate)
to fail. This blocks any engineer or PE build gate from shipping changes until the lockfile
is patched, silently wedging the site.

## Evidence

rc-9.com: `pixi.js@8.18.1 → @xmldom/xmldom@0.8.13`  
Fix applied: `npm audit fix` in `site/` upgraded to `0.8.15` (the first non-vulnerable release).  
`npm run security:audit:prod` now returns 0 vulnerabilities.

## Proposed fix (per-site, ~1 minute each)

```bash
cd <site>/site && npm audit fix
# Verify: npm run security:audit:prod should return 0 vulnerabilities
# Commit: package-lock.json change only (no package.json change needed)
```

## Sites likely affected

Any site in the fleet with `pixi.js@8.x` in its `site/package.json`. Check with:

```bash
grep -l '"pixi.js"' */site/package.json
```

## Risk

Low. `npm audit fix` only bumps `@xmldom/xmldom` within the semver range pixi.js allows;
it does not upgrade pixi.js itself. The patch is a minor/patch release fixing XML
serialization edge cases that do not affect pixi.js's rendering path.
