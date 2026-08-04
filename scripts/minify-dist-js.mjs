/**
 * Minify the hand-written scripts in public/js after the Astro build.
 *
 * Anything in public/ is copied to dist/ verbatim — Astro deliberately does not
 * touch it. That left integration-field.js, water-ripple.js, underwater-dive.js
 * and reveal.js shipping as unminified source, which Lighthouse flagged as ~13KB
 * of avoidable transfer plus the parse cost that comes with it.
 *
 * This runs against dist/, not public/, so the sources stay readable and
 * debuggable. Files already minified (public/js/vendor/*) are skipped.
 */
import { build } from 'esbuild';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST_JS = 'dist/js';

async function jsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // vendor/ holds pre-minified third-party bundles — leave them alone
      if (entry.name === 'vendor') continue;
      out.push(...(await jsFiles(full)));
    } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
      out.push(full);
    }
  }
  return out;
}

const files = await jsFiles(DIST_JS);
let before = 0;
let after = 0;

for (const file of files) {
  const original = (await stat(file)).size;
  await build({
    entryPoints: [file],
    outfile: file,
    allowOverwrite: true,
    minify: true,
    target: ['es2018'],
    legalComments: 'none',
    logLevel: 'warning',
  });
  const minified = (await stat(file)).size;

  // Guard: an empty or near-empty output means something went wrong.
  if (minified < 100 && original > 500) {
    throw new Error(`Refusing to ship ${file}: minified to ${minified} bytes from ${original}`);
  }
  before += original;
  after += minified;
  console.log(
    `  ${file.padEnd(34)} ${String(original).padStart(6)} -> ${String(minified).padStart(6)} bytes`
  );
}

console.log(
  `minified ${files.length} file(s): ${(before / 1024).toFixed(1)}KB -> ${(after / 1024).toFixed(1)}KB ` +
    `(${(((before - after) / before) * 100).toFixed(0)}% smaller)`
);
