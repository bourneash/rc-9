import { readFile } from 'node:fs/promises';
import { loadConfigFromFile } from 'vite';

const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const adsense = await readFile(new URL('../public/adsense.js', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');
const terms = await readFile(new URL('../terms.html', import.meta.url), 'utf8');
const builtHomepage = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const { config: viteConfig } = await loadConfigFromFile(
  { command: 'serve', mode: 'development' },
  new URL('../vite.config.js', import.meta.url).pathname,
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const beacon = "<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"d76e9de989014f4d9e34e56682547f06\"}'></script>";

assert((homepage.match(/<main\b/g) || []).length === 1, 'homepage must contain exactly one main landmark');
assert(homepage.includes('<main>') && homepage.includes('</main>'), 'homepage main landmark must be closed');
assert(homepage.includes(`<!-- Cloudflare Web Analytics -->${beacon}<!-- End Cloudflare Web Analytics -->`), 'source homepage must retain the canonical deferred Cloudflare beacon');
assert(adsense.includes("window.location.hostname !== 'rc-9.com'"), 'AdSense must guard non-production hostnames');
assert((privacy.match(/<a href="\/help">Help<\/a>/g) || []).length === 1, 'privacy must keep exactly one footer Help link');
assert((terms.match(/<a href="\/help">Help<\/a>/g) || []).length === 1, 'terms must keep exactly one footer Help link');

const beaconGuard = viteConfig.plugins.find((plugin) => plugin.name === 'development-cloudflare-beacon-guard');
assert(beaconGuard?.apply === 'serve', 'Cloudflare beacon guard must apply only during development serve');
assert(typeof beaconGuard?.transformIndexHtml === 'function', 'Cloudflare beacon guard must transform development HTML');

const devHtml = beaconGuard.transformIndexHtml(`${beacon}<script src="/unrelated.js"></script>`);
assert(!devHtml.includes(beacon), 'development HTML must remove the configured Cloudflare beacon');
assert(devHtml.includes('<script src="/unrelated.js"></script>'), 'development transform must retain unrelated scripts');
assert(beaconGuard.apply !== 'build', 'Cloudflare beacon guard must not apply to production builds');
assert(builtHomepage.includes(`<!-- Cloudflare Web Analytics -->${beacon}<!-- End Cloudflare Web Analytics -->`), 'built homepage must retain the canonical deferred Cloudflare beacon');
assert(!builtHomepage.includes('cloudflareBeacon'), 'built homepage must not contain a dynamically inserted Cloudflare beacon');

console.log('Homepage landmark, production-host guards, legal Help links, and Cloudflare beacon transforms verified.');
