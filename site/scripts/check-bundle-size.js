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
