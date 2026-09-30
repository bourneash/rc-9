#!/usr/bin/env node
// Posts all sitemap URLs to IndexNow (api.indexnow.org).
// Requires INDEXNOW_KEY env var. Exits 0 gracefully when key is absent.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const SITEMAP = resolve(SITE_ROOT, 'dist/sitemap-0.xml');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const HOST = 'rc-9.com';

const key = process.env.INDEXNOW_KEY;
if (!key) {
  console.log('INDEXNOW_KEY not set — skipping IndexNow ping');
  process.exit(0);
}

// IndexNow requires a key verification file at https://<host>/<key>.txt
const keyFile = resolve(SITE_ROOT, 'public', `${key}.txt`);
if (!existsSync(keyFile)) {
  writeFileSync(keyFile, key, 'utf8');
  console.log(`Created key verification file: public/${key}.txt`);
}

let xml;
try {
  xml = readFileSync(SITEMAP, 'utf8');
} catch (e) {
  console.error(`Cannot read sitemap at ${SITEMAP}: ${e.message}`);
  process.exit(1);
}

const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) {
  console.log('No URLs in sitemap — nothing to ping');
  process.exit(0);
}

const body = JSON.stringify({ host: HOST, key, urlList: urls });
let res;
try {
  res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });
} catch (e) {
  console.error(`IndexNow fetch failed: ${e.message}`);
  process.exit(1);
}

if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow: submitted ${urls.length} URLs → HTTP ${res.status}`);
} else {
  const text = await res.text().catch(() => '');
  console.error(`IndexNow: HTTP ${res.status} — ${text.slice(0, 200)}`);
  process.exit(1);
}
