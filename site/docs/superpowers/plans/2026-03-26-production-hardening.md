# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Scorched Earth game for production deployment on Cloudflare Pages with build gates, bundle optimization, CSP tightening, and production polish.

**Architecture:** Local deploy pipeline via wrangler CLI with a `build:prod` gate (lint + audit + build + size check). Vite config enhanced with Terser console stripping, build metadata injection, and pre-compression. CSP tightened by removing an unnecessary inline script. Built-in error reporter and version display added to existing UI.

**Tech Stack:** Vite 7, Terser, Wrangler CLI (Cloudflare Pages), vite-plugin-compression, Node.js scripts

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `vite.config.js` | Modify | Terser pure_funcs, remove React chunk, build metadata, compression plugin |
| `package.json` | Modify | Add deploy/build scripts, add vite-plugin-compression dev dep |
| `scripts/check-bundle-size.js` | Create | Bundle size budget enforcement script |
| `js/game.js` | Modify | Gate test API behind `import.meta.env.DEV` |
| `js/errors.js` | Modify | Add `copyErrorReport()` method with build metadata |
| `index.html` | Modify | Remove inline script, add meta tags, add error report button |
| `js/main.js` | Modify | Wire error report button, add version display |
| `public/_headers` | Modify | Remove `'unsafe-inline'` from `script-src` |
| `.gitignore` | Modify | Add `lighthouse-report.html` |

---

### Task 1: Install vite-plugin-compression

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the plugin**

Run:

```bash
npm install --save-dev vite-plugin-compression
```

- [ ] **Step 2: Verify installation**

Run:

```bash
node -e "require('vite-plugin-compression')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vite-plugin-compression dev dependency"
```

---

### Task 2: Harden vite.config.js

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Update vite.config.js with all production hardening changes**

Replace the entire contents of `vite.config.js` with:

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import compression from 'vite-plugin-compression';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // Not in a git repo or git not available
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    compression({ algorithm: 'gzip', ext: '.gz' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        help: resolve(__dirname, 'help.html')
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pixi.js') || id.includes('pixi-filters')) return 'vendor-pixi';
          if (id.includes('howler')) return 'vendor-audio';
          if (id.includes('gsap')) return 'vendor-gsap';
          return 'vendor';
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
    sourcemap: false,
  },
  server: {
    port: 5600,
    strictPort: false,
    open: true
  },
  preview: {
    port: 5601,
    strictPort: false
  }
});
```

Key changes from the original:
- Added `compression` plugin import and two plugin instances (gzip + brotli)
- Added `define` block with `__BUILD_VERSION__`, `__BUILD_HASH__`, `__BUILD_DATE__`
- Removed the `vendor-react` manual chunk (React is no longer used)
- Added `terserOptions.compress.pure_funcs` to strip `console.log`, `console.debug`, `console.info`
- Added `execSync` and `readFileSync` imports for build metadata

- [ ] **Step 2: Verify the build still works**

Run:

```bash
npm run build
```

Expected: Build succeeds. Output should no longer show a `vendor-react` chunk. Should show `.gz` and `.br` files generated.

- [ ] **Step 3: Verify console stripping works**

Run:

```bash
grep -c 'console.log' dist/assets/main-*.js
```

Expected: `0` (all console.log calls stripped from production build)

- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "feat: harden vite config - console stripping, compression, build metadata"
```

---

### Task 3: Create bundle size budget script

**Files:**
- Create: `scripts/check-bundle-size.js`

- [ ] **Step 1: Create the scripts directory and budget checker**

Create `scripts/check-bundle-size.js`:

```js
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_ASSETS = 'dist/assets';
const BUDGETS = {
  'vendor-pixi': 950 * 1024,
  'main': 350 * 1024,
  '__default__': 150 * 1024
};
const TOTAL_BUDGET = 1600 * 1024;

let totalSize = 0;
let failed = false;
const results = [];

let files;
try {
  files = readdirSync(DIST_ASSETS);
} catch {
  console.error(`ERROR: ${DIST_ASSETS} not found. Run "npm run build" first.`);
  process.exit(1);
}

for (const file of files) {
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
  // Skip pre-compressed files
  if (file.endsWith('.gz') || file.endsWith('.br')) continue;

  const filePath = join(DIST_ASSETS, file);
  const size = statSync(filePath).size;
  totalSize += size;

  // Match chunk name (e.g., "vendor-pixi" from "vendor-pixi-CROD_nvT.js")
  const chunkName = file.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '');
  const budget = BUDGETS[chunkName] || BUDGETS['__default__'];

  const overBudget = size > budget;
  if (overBudget) failed = true;

  results.push({
    file,
    size,
    budget,
    overBudget
  });
}

// Print report
console.log('\n  Bundle Size Report');
console.log('  ' + '-'.repeat(60));

for (const r of results) {
  const sizeKB = (r.size / 1024).toFixed(1).padStart(8);
  const budgetKB = (r.budget / 1024).toFixed(0).padStart(6);
  const status = r.overBudget ? 'OVER' : 'ok';
  const marker = r.overBudget ? '>' : ' ';
  console.log(`  ${marker} ${r.file.padEnd(35)} ${sizeKB} KB / ${budgetKB} KB  ${status}`);
}

console.log('  ' + '-'.repeat(60));
const totalKB = (totalSize / 1024).toFixed(1).padStart(8);
const totalBudgetKB = (TOTAL_BUDGET / 1024).toFixed(0).padStart(6);
const totalOver = totalSize > TOTAL_BUDGET;
if (totalOver) failed = true;
console.log(`    ${'TOTAL'.padEnd(35)} ${totalKB} KB / ${totalBudgetKB} KB  ${totalOver ? 'OVER' : 'ok'}`);
console.log();

if (failed) {
  console.error('  Bundle size budget exceeded! Review chunks above marked OVER.\n');
  process.exit(1);
} else {
  console.log('  All chunks within budget.\n');
}
```

- [ ] **Step 2: Verify the script runs against the existing build**

Run:

```bash
node scripts/check-bundle-size.js
```

Expected: A table showing all chunks with sizes and budgets. Should pass (all within budget based on current build output: vendor-pixi ~897KB < 950KB budget, main ~318KB < 350KB budget).

- [ ] **Step 3: Commit**

```bash
git add scripts/check-bundle-size.js
git commit -m "feat: add bundle size budget enforcement script"
```

---

### Task 4: Add deploy and build scripts to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add new scripts to package.json**

Add the following scripts to the `"scripts"` object in `package.json` (after the existing `"test:smoke"` entry):

```json
"build:prod": "npm run lint && npm run security:audit:prod && npm run build && node scripts/check-bundle-size.js",
"check:bundle-size": "node scripts/check-bundle-size.js",
"deploy": "npm run build:prod && npx wrangler pages deploy dist --project-name=scorched-earth",
"deploy:preview": "npm run build:prod && npx wrangler pages deploy dist --project-name=scorched-earth --branch=preview",
"lighthouse": "npx lighthouse http://localhost:5600 --output html --output-path ./lighthouse-report.html --chrome-flags='--headless'"
```

- [ ] **Step 2: Verify build:prod runs the full gate**

Run:

```bash
npm run build:prod
```

Expected: Runs lint, then security audit, then build, then bundle size check. All pass.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add deploy pipeline scripts (build:prod, deploy, deploy:preview)"
```

---

### Task 5: Gate test API behind dev check

**Files:**
- Modify: `js/game.js:19-23`

- [ ] **Step 1: Update the test API exposure to dev-only**

In `js/game.js`, replace lines 19-23:

```js
        try {
            globalThis.__se_activeGame = this;
            // Expose testing API globally for automated testing
            globalThis.__SE_TEST_API__ = () => this.getTestAPI();
        } catch {}
```

With:

```js
        try {
            globalThis.__se_activeGame = this;
            if (import.meta.env.DEV) {
                globalThis.__SE_TEST_API__ = () => this.getTestAPI();
            }
        } catch {}
```

- [ ] **Step 2: Verify the build succeeds**

Run:

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Verify test API is stripped from production build**

Run:

```bash
grep '__SE_TEST_API__' dist/assets/main-*.js
```

Expected: No output (the test API assignment is removed by dead-code elimination).

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "fix: gate test API behind dev-only check"
```

---

### Task 6: Remove inline script and tighten CSP

**Files:**
- Modify: `index.html:13-19`
- Modify: `styles.css` (top of file)
- Modify: `public/_headers:9`

- [ ] **Step 1: Move inline style to styles.css**

Check if `html, body { height: 100%; }` already exists in `styles.css`. If not, add it to the very top of the file:

```css
html, body { height: 100%; }
```

- [ ] **Step 2: Remove the inline style and script blocks from index.html**

In `index.html`, remove lines 13-19:

```html
    <style>
      html, body { height: 100%; }
    </style>
    <script>
      // Ensure DOMContentLoaded fires before module init in some browsers
      document.addEventListener('DOMContentLoaded', function(){ /* noop */ });
    </script>
```

Delete these lines entirely. The style is now in `styles.css`, and the script is a noop.

- [ ] **Step 3: Remove `'unsafe-inline'` from script-src in `public/_headers`**

In `public/_headers` line 9, in the Content-Security-Policy header, change:

```
script-src 'self' 'unsafe-inline'
```

To:

```
script-src 'self'
```

Keep `'unsafe-inline'` in `style-src` (GSAP/PixiJS need it for dynamic inline styles).

- [ ] **Step 4: Rebuild and verify no inline scripts in output**

Run:

```bash
npm run build && grep '<script>' dist/index.html
```

Expected: No matches (no inline `<script>` tags remain). The only script tag should be `<script type="module" ...>`.

- [ ] **Step 5: Commit**

```bash
git add index.html public/_headers styles.css
git commit -m "security: remove inline scripts, tighten CSP script-src"
```

---

### Task 7: Add meta tags for social sharing

**Files:**
- Modify: `index.html` (in `<head>`, after the favicon link)

- [ ] **Step 1: Add meta tags to index.html**

After the `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` line in `index.html`, add:

```html
    <meta name="description" content="Browser-based artillery tank game inspired by the classic DOS game. Destructible terrain, realistic physics, AI opponents.">
    <meta property="og:title" content="Scorched Earth">
    <meta property="og:description" content="Classic artillery tank combat in your browser">
    <meta property="og:type" content="website">
    <meta name="theme-color" content="#0a0e27">
```

Note: `og:image` is omitted until a screenshot/promo image is created and placed in `public/`.

- [ ] **Step 2: Verify the tags appear in the build output**

Run:

```bash
npm run build && grep 'og:title' dist/index.html
```

Expected: The `og:title` meta tag is present.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add social sharing and SEO meta tags"
```

---

### Task 8: Enhance error reporter with copy-to-clipboard

**Files:**
- Modify: `js/errors.js:144` (before closing `}` of the class)

- [ ] **Step 1: Add `copyErrorReport()` and `getFullReport()` methods to ErrorLogger**

In `js/errors.js`, add these two methods to the `ErrorLogger` class, immediately before the closing `}` on line 145:

```js
    /**
     * Generate a formatted error report string with build metadata
     */
    getFullReport() {
        const version = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
        const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local';
        const buildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'n/a';

        let report = `Scorched Earth Error Report\n`;
        report += `Version: ${version} (${hash})\n`;
        report += `Built: ${buildDate}\n`;
        report += `Browser: ${navigator.userAgent}\n`;
        report += `URL: ${window.location.href}\n`;
        report += `Time: ${new Date().toISOString()}\n`;
        report += `Errors: ${this.errors.length}\n`;
        report += `${'='.repeat(50)}\n\n`;

        if (this.errors.length === 0) {
            report += 'No errors recorded.\n';
        } else {
            for (const err of this.errors) {
                report += `[${err.timestamp}] [${err.context}]\n`;
                report += `  ${err.message}\n`;
                if (err.stack) {
                    report += `  Stack: ${err.stack.split('\n').slice(0, 3).join('\n  ')}\n`;
                }
                if (err.data && Object.keys(err.data).length > 0) {
                    report += `  Data: ${JSON.stringify(err.data)}\n`;
                }
                report += '\n';
            }
        }

        return report;
    }

    /**
     * Copy error report to clipboard
     * @returns {Promise<boolean>} whether the copy succeeded
     */
    async copyErrorReport() {
        const report = this.getFullReport();
        try {
            await navigator.clipboard.writeText(report);
            return true;
        } catch {
            // Fallback for older browsers or non-HTTPS
            const textarea = document.createElement('textarea');
            textarea.value = report;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch {
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }
```

- [ ] **Step 2: Verify the build still succeeds**

Run:

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add js/errors.js
git commit -m "feat: add error report copy-to-clipboard with build metadata"
```

---

### Task 9: Add error report button to debug modal and version display

**Files:**
- Modify: `index.html:117-123` (debug modal)
- Modify: `index.html` (before `</body>`)
- Modify: `js/main.js` (end of file)

- [ ] **Step 1: Add the error report button to the debug modal in index.html**

In `index.html`, replace lines 117-123:

```html
    <dialog id="debug-modal" class="modal hidden" aria-labelledby="debug-title">
        <div class="modal-content">
            <button id="debug-modal-close" class="modal-close" title="Close" aria-label="Close">&#10006;</button>
            <h2 id="debug-title">Debug / Cheats</h2>
            <div id="debug-modal-body"></div>
        </div>
    </dialog>
```

With:

```html
    <dialog id="debug-modal" class="modal hidden" aria-labelledby="debug-title">
        <div class="modal-content">
            <button id="debug-modal-close" class="modal-close" title="Close" aria-label="Close">&#10006;</button>
            <h2 id="debug-title">Debug / Cheats</h2>
            <div id="debug-modal-body"></div>
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button id="copy-error-report" style="font-size: 0.85em; padding: 6px 12px; cursor: pointer;">Copy Error Report</button>
                <span id="copy-report-status" style="margin-left: 8px; font-size: 0.8em; opacity: 0.7;"></span>
            </div>
        </div>
    </dialog>
```

- [ ] **Step 2: Add a version display element before `</body>` in index.html**

Just before the `</body>` tag (line 462), add:

```html
    <div id="version-display" style="position: fixed; bottom: 4px; right: 8px; font-size: 10px; opacity: 0.3; color: #888; pointer-events: none; z-index: 999; font-family: monospace;"></div>
```

- [ ] **Step 3: Wire up the error report button and version display in main.js**

At the very end of `js/main.js` (after line 3236), add:

```js
// --- Production: error report button + version display ---
(function initProductionUI() {
    const copyBtn = document.getElementById('copy-error-report');
    const copyStatus = document.getElementById('copy-report-status');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const success = await window.errorLogger?.copyErrorReport?.();
            if (copyStatus) {
                copyStatus.textContent = success ? 'Copied!' : 'Copy failed';
                setTimeout(() => { copyStatus.textContent = ''; }, 2000);
            }
        });
    }

    const versionEl = document.getElementById('version-display');
    if (versionEl) {
        const version = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
        const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'local';
        versionEl.textContent = `v${version} (${hash})`;
    }
})();
```

- [ ] **Step 4: Verify the build succeeds**

Run:

```bash
npm run build
```

Expected: Build succeeds. The `__BUILD_VERSION__` and `__BUILD_HASH__` references are replaced with actual string values by Vite's `define`.

- [ ] **Step 5: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: add error report button and version display to UI"
```

---

### Task 10: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add lighthouse report and compressed artifacts to .gitignore**

Append to `.gitignore`:

```
# Lighthouse reports
lighthouse-report.html

# Pre-compressed build artifacts (generated by vite-plugin-compression)
*.gz
*.br
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore lighthouse reports and compressed artifacts"
```

---

### Task 11: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full production build gate**

Run:

```bash
npm run build:prod
```

Expected: Lint passes, security audit passes, build succeeds, bundle size check passes.

- [ ] **Step 2: Verify console.log stripping**

Run:

```bash
grep -c 'console.log' dist/assets/main-*.js
```

Expected: `0`

- [ ] **Step 3: Verify test API is stripped**

Run:

```bash
grep '__SE_TEST_API__' dist/assets/main-*.js
```

Expected: No output.

- [ ] **Step 4: Verify pre-compressed files exist**

Run:

```bash
ls dist/assets/*.gz dist/assets/*.br | head -10
```

Expected: `.gz` and `.br` files for each JS and CSS chunk.

- [ ] **Step 5: Verify CSP is tightened**

Run:

```bash
grep 'script-src' dist/_headers
```

Expected: `script-src 'self'` without `'unsafe-inline'`.

- [ ] **Step 6: Verify meta tags**

Run:

```bash
grep 'og:title' dist/index.html
```

Expected: The og:title meta tag is present.

- [ ] **Step 7: Preview the build locally**

Run:

```bash
npm run preview
```

Open `http://localhost:5601` in a browser. Verify:
- Game loads and plays normally
- No console errors about CSP violations
- Version string visible in bottom-right corner
- Debug modal has "Copy Error Report" button
- Clicking the button copies a report to clipboard

- [ ] **Step 8: Test deploy to preview**

Run:

```bash
npm run deploy:preview
```

Expected: Wrangler deploys to a preview URL. Test the preview URL in a browser to confirm everything works on Cloudflare Pages.
