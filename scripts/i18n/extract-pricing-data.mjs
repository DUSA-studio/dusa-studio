// Regenerates the English `pricing.data` block in en.json from the arrays in
// src/components/PricingContent.astro, so translators always have an exact
// reference. Run from dusa-site: node scripts/i18n/extract-pricing-data.mjs
import fs from 'node:fs';
const src = fs.readFileSync('src/components/PricingContent.astro', 'utf8');
function slice(startMarker) {
  const i = src.indexOf(startMarker); if (i < 0) throw new Error('missing ' + startMarker);
  const j = src.indexOf('\n];', i); return src.slice(i + startMarker.length - 1, j + 2);
}
const cells = { pick1: 'Pick 1', unlimited: 'Unlimited', included: 'Included', payg: 'Pay as you go', aiReplies: '1,000 replies/mo', aiMinutes: '100 min/mo', extraUser: '{extraUser}/mo each' };
const p = new Proxy({}, { get: (_, k) => '{p.' + String(k) + '}' });
const prices = { launchpad: 47, starter: 149, growth: 297 };
const tiers = new Function('cells', 'p', 'prices', 'return ' + slice('const tiers = ['))(cells, p, prices);
const featureCategories = new Function('cells', 'return ' + slice('const featureCategories = ['))(cells);
const faqs = new Function('return ' + slice('const faqs = ['))();
const replacements = new Function('return ' + slice('const replacements = ['))();
const enPath = 'src/i18n/translations/en.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
en.pricing.data = {
  tierHighlights: Object.fromEntries(tiers.map((t) => [t.id, t.highlights])),
  replacementFeatures: replacements.map((r) => r.feature),
  cells,
  featureCategories: featureCategories.map((c) => ({ name: c.name, rows: c.features.map((f) => [f.label, f.desc]) })),
  faqs: faqs.map((f) => ({ q: f.q, a: f.a })),
};
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log('en.json pricing.data regenerated:', featureCategories.length, 'categories', faqs.length, 'faqs');
