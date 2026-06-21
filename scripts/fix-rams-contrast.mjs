#!/usr/bin/env node
/**
 * Bulk-replace dark-glass rgba(255,255,255,*) tokens with RAMS ink/line tokens.
 * Skips map canvas overlays (map-loading, map-story, region-selector dark chrome).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'src');

const REPLACEMENTS = [
  [/rgba\(255,\s*255,\s*255,\s*0\.85\)/g, 'var(--ink)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.75\)/g, 'var(--ink-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.7\)/g, 'var(--ink-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.65\)/g, 'var(--ink-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.55\)/g, 'var(--ink-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.5\)/g, 'var(--ink-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.45\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.4\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.35\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.3\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.28\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.25\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.2\)/g, 'var(--ink-3)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.14\)/g, 'var(--line-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.12\)/g, 'var(--line-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'var(--line-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.08\)/g, 'var(--line-2)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.06\)/g, 'var(--line)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.05\)/g, 'var(--line)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.04\)/g, 'var(--line)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, 'var(--line)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.025\)/g, 'var(--surface-hover)'],
  [/rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'var(--surface-hover)'],
  [/rgba\(248,\s*250,\s*252,\s*0\.7\)/g, 'var(--ink-2)'],
];

const SKIP_PATH_FRAGMENTS = [
  'map-loading',
  'map-story-strip',
  'map-story-card',
  'map-story-header',
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (['.jsx', '.js', '.css'].includes(extname(p))) files.push(p);
  }
  return files;
}

let totalReplacements = 0;

for (const file of walk(ROOT)) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  if (file.endsWith('.css') && file.includes('index.css')) {
    // Panel/chrome sections only — preserve map overlay dark glass blocks
    const blocks = content.split(/(?=\/\* ═+)/);
    content = blocks.map((block) => {
      const isMapOverlay = SKIP_PATH_FRAGMENTS.some((f) => block.includes(`.${f}`));
      if (isMapOverlay) return block;
      let b = block;
      for (const [re, rep] of REPLACEMENTS) {
        b = b.replace(re, rep);
      }
      return b;
    }).join('');
  } else if (file.includes('mapTrafficIcons')) {
    // Map popups stay dark — only fix if on light panel context
    continue;
  } else {
    for (const [re, rep] of REPLACEMENTS) {
      content = content.replace(re, rep);
    }
  }

  if (content !== original) {
    const count = [...original.matchAll(/rgba\(255,\s*255,\s*255/g)].length
      - [...content.matchAll(/rgba\(255,\s*255,\s*255/g)].length;
    totalReplacements += Math.max(count, 1);
    writeFileSync(file, content);
    console.log(`fixed: ${file.replace(ROOT + '/', '')}`);
  }
}

console.log(`\nTotal rgba-white rules replaced: ${totalReplacements}`);
