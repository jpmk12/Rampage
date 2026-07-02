// Regenerate docs/asset-manifest.json (and print a checklist) from the single
// source of truth, src/data/assetManifest.js.  Run:  node scripts/asset-manifest.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { assetKeys, ASSETS, BIOMES } from '../src/data/assetManifest.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keys = assetKeys();

const out = {
  generatedFrom: 'src/data/assetManifest.js',
  biomes: BIOMES,
  count: keys.length,
  groups: ASSETS.length,
  assets: keys.map((a) => ({
    key: a.key,
    file: `${a.key}.png`,
    w: a.w,
    h: a.h,
    anchor: a.anchor,
    group: a.group,
    facing: a.facing || null,
    tiles: !!a.tiles,
    tinted: !!a.tinted,
    desc: a.desc,
  })),
};

writeFileSync(resolve(root, 'docs/asset-manifest.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote docs/asset-manifest.json — ${keys.length} texture keys across ${ASSETS.length} groups.`);

// human checklist grouped
const byGroup = {};
for (const a of keys) (byGroup[a.group] ||= []).push(a);
for (const [g, list] of Object.entries(byGroup)) {
  console.log(`\n${g} (${list.length})`);
  for (const a of list) console.log(`  [ ] ${a.key}.png  ${a.w}x${a.h}  (${a.anchor})`);
}
