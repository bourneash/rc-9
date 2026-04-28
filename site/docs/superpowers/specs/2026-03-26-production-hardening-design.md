# Production Hardening Design

**Date:** 2026-03-26
**Status:** Approved
**Target:** Cloudflare Pages deployment

## Context

Scorched Earth is a browser-based artillery game built with vanilla JS, PixiJS, GSAP, and Howler. It's currently well-architected with error handling, memory management, security headers, and input validation already in place. This spec covers the remaining hardening needed to go from development to production.

**Deployment:** Cloudflare Pages via `wrangler pages deploy` (local CLI, no CI)
**No external services:** No Sentry, no GitHub Actions, no Lighthouse CI

---

## Tier 1 — Build & Deploy Pipeline

### 1.1 Deploy Scripts (package.json)

Add the following scripts:

```json
"deploy": "npm run build:prod && npx wrangler pages deploy dist --project-name=scorched-earth",
"deploy:preview": "npm run build:prod && npx wrangler pages deploy dist --project-name=scorched-earth --branch=preview",
"build:prod": "npm run lint && npm run security:audit:prod && npm run build && npm run check:bundle-size",
"check:bundle-size": "node scripts/check-bundle-size.js",
"lighthouse": "npx lighthouse http://localhost:5600 --output html --output-path ./lighthouse-report.html --chrome-flags='--headless'"
```

- `deploy` — full gate (lint + audit + build + size check) then deploy to production
- `deploy:preview` — same gate, deploys to a preview URL for testing
- `build:prod` — the deploy gate without actually deploying
- `check:bundle-size` — fails if any chunk exceeds budget
- `lighthouse` — manual Lighthouse run (not automated)

### 1.2 Strip console.log in Production (vite.config.js)

Add to Terser options:

```js
compress: {
  drop_console: false,
  pure_funcs: ['console.log', 'console.debug', 'console.info']
}
```

This strips `console.log`, `console.debug`, and `console.info` from production builds. Keeps `console.warn` and `console.error` for real issues.

### 1.3 Remove Dead React Vendor Chunk (vite.config.js)

The current manual chunks config includes `vendor-react` splitting React dependencies. React has been removed from the project (files deleted in current git status). Remove the `vendor-react` chunk from `manualChunks`.

### 1.4 Gate Test API Behind Dev Check (game.js)

Current code (line ~22):
```js
globalThis.__SE_TEST_API__ = () => this.getTestAPI();
```

Change to:
```js
if (import.meta.env.DEV) {
  globalThis.__SE_TEST_API__ = () => this.getTestAPI();
}
```

Vite will dead-code-eliminate this in production builds.

### 1.5 Build Metadata Injection (vite.config.js)

Use Vite's `define` to inject build info:

```js
define: {
  __BUILD_VERSION__: JSON.stringify(pkg.version),
  __BUILD_HASH__: JSON.stringify(gitHash),
  __BUILD_DATE__: JSON.stringify(new Date().toISOString())
}
```

Read `package.json` version and `git rev-parse --short HEAD` at build time.

---

## Tier 2 — Performance & Bundle Optimization

### 2.1 Pre-compressed Assets

Add `vite-plugin-compression` to generate `.gz` and `.br` files at build time. Cloudflare Pages serves pre-compressed assets automatically when available.

```js
import compression from 'vite-plugin-compression';

plugins: [
  compression({ algorithm: 'gzip', ext: '.gz' }),
  compression({ algorithm: 'brotliCompress', ext: '.br' })
]
```

### 2.2 Bundle Size Budget (scripts/check-bundle-size.js)

A simple Node script that:
1. Reads all files in `dist/assets/`
2. Checks each chunk against a budget:
   - `vendor-pixi`: 900KB (PixiJS is ~880KB, small headroom)
   - `main`: 350KB
   - Any other chunk: 150KB
   - Total: 1600KB
3. Exits with code 1 if any budget is exceeded
4. Prints a size report table on success

### 2.3 PixiJS Tree-Shaking

**Skipped.** PixiJS v8 is already modular and the game likely uses most features. The 880KB is expected for a 2D game engine. ROI too low for the refactoring effort.

---

## Tier 3 — Production Polish

### 3.1 CSP Tightening (public/_headers)

**Scripts:** Attempt to remove `'unsafe-inline'` from `script-src`. The app uses module scripts loaded via `<script type="module">` which don't need `unsafe-inline`. If Vite injects inline scripts in the build output, we'll need to keep it or use hashes.

**Styles:** Keep `'unsafe-inline'` for `style-src`. GSAP and PixiJS manipulate inline styles dynamically — removing this would break the game.

**Action:** Check Vite build output for inline scripts. If none, remove `'unsafe-inline'` from `script-src`. If present, leave as-is.

### 3.2 Meta Tags for Social Sharing (index.html)

Add to `<head>`:
```html
<meta name="description" content="Browser-based artillery tank game inspired by the classic DOS game. Destructible terrain, realistic physics, AI opponents.">
<meta property="og:title" content="Scorched Earth">
<meta property="og:description" content="Classic artillery tank combat in your browser">
<meta property="og:type" content="website">
<meta property="og:image" content="/og-image.png">
<meta name="theme-color" content="#0a0e27">
```

Note: `og:image` requires an actual screenshot/promo image to be created and placed in `/public/og-image.png`. This is a manual step — we'll add the meta tag pointing to it but won't generate the image.

### 3.3 Built-in Error Reporter Enhancement (js/errors.js)

The existing `ErrorLogger` class already tracks errors in memory (max 100). Enhance it with:

1. **Copy report button** — add a method `copyErrorReport()` that formats all stored errors as text and copies to clipboard
2. **Expose in debug panel** — add a "Copy Error Report" button to the existing debug modal in index.html
3. **Include build metadata** — prepend version, git hash, build date, browser UA to the report

This keeps everything self-contained with no external dependencies.

### 3.4 Version Display in UI

Add a small version string to the game UI (bottom-right corner or in the existing debug/options panel):

```
v1.0.0 (abc1234)
```

Uses `__BUILD_VERSION__` and `__BUILD_HASH__` injected at build time. Shown subtly — doesn't interfere with gameplay.

### 3.5 Staging vs Production Deploy

- `npm run deploy` — deploys to Cloudflare Pages production
- `npm run deploy:preview` — deploys to a preview branch URL (e.g., `preview.scorched-earth.pages.dev`)

Both run the same build gate. The only difference is the `--branch` flag to wrangler.

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add deploy/build scripts, add vite-plugin-compression dev dep |
| `vite.config.js` | Terser pure_funcs, remove React chunk, build metadata, compression plugin |
| `js/game.js` | Gate `__SE_TEST_API__` behind `import.meta.env.DEV` |
| `js/errors.js` | Add `copyErrorReport()` with build metadata |
| `js/main.js` | Add version display, wire up error report button |
| `index.html` | Add meta tags, add error report button to debug panel |
| `public/_headers` | Tighten CSP if feasible |
| `scripts/check-bundle-size.js` | New file — bundle budget checker |
| `.gitignore` | Add `lighthouse-report.html` |

## Files NOT Changed

- `js/constants.js` — no changes needed
- `js/projectile.js` — no changes needed
- `styles.css` — no changes needed (version display styled inline or minimal)
- `config.json` — no changes needed

---

## Out of Scope

- GitHub Actions / CI pipeline
- External error reporting (Sentry, etc.)
- PixiJS tree-shaking
- Image optimization (no image assets)
- Network play / multiplayer
- TypeScript migration
