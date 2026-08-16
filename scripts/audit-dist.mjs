// Static site audit over dist/: broken internal links, meta hygiene,
// image alts, duplicate IDs, heading order. Run: node scripts/audit-dist.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const pages = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (e.endsWith('.html')) pages.push(p);
  }
})(DIST);

const issues = { links: [], meta: [], alts: [], ids: [], headings: [] };
const seenDescriptions = new Map();

function rel(p) { return p.replace(DIST, '') || '/'; }

function targetExists(href) {
  // strip query/hash
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return true; // pure-hash link
  let p = join(DIST, decodeURIComponent(clean));
  if (existsSync(p)) {
    if (statSync(p).isDirectory()) return existsSync(join(p, 'index.html'));
    return true;
  }
  if (existsSync(p + '.html')) return true;
  if (existsSync(join(dirname(p), '')) && existsSync(p + '/index.html')) return true;
  return false;
}

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const r = rel(page);

  // internal links
  for (const m of html.matchAll(/<a\s[^>]*href="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    if (!targetExists(href)) issues.links.push(`${r} -> ${href}`);
  }

  // meta
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
  if (!title) issues.meta.push(`${r}: NO TITLE`);
  else if (title.length > 65) issues.meta.push(`${r}: title ${title.length} chars`);
  if (!desc) issues.meta.push(`${r}: NO DESCRIPTION`);
  else {
    if (desc.length > 165) issues.meta.push(`${r}: description ${desc.length} chars`);
    if (seenDescriptions.has(desc) && !r.match(/^\/(us|uk|es|mx|br|fr|de)\//)) {
      issues.meta.push(`${r}: description duplicates ${seenDescriptions.get(desc)}`);
    } else if (!seenDescriptions.has(desc)) {
      seenDescriptions.set(desc, r);
    }
  }
  if (!canonical) issues.meta.push(`${r}: NO CANONICAL`);

  // img alts
  for (const m of html.matchAll(/<img\s[^>]*>/g)) {
    if (!/alt="/.test(m[0])) {
      const src = (m[0].match(/src="([^"]*)"/) || [])[1] || '?';
      issues.alts.push(`${r}: ${src}`);
    }
  }

  // duplicate ids
  const ids = {};
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    ids[m[1]] = (ids[m[1]] || 0) + 1;
  }
  for (const [id, n] of Object.entries(ids)) {
    if (n > 1) issues.ids.push(`${r}: #${id} x${n}`);
  }

  // heading order: h1 count
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) issues.headings.push(`${r}: ${h1s} h1s`);
}

console.log(`pages: ${pages.length}`);
for (const [k, list] of Object.entries(issues)) {
  console.log(`\n== ${k}: ${list.length} ==`);
  const uniq = [...new Set(list)];
  for (const l of uniq.slice(0, 25)) console.log('  ' + l);
  if (uniq.length > 25) console.log(`  ... +${uniq.length - 25} more`);
}
