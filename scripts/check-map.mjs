// Check every advertised plan price sits at or above HighLevel's standard price
// for the similar package (ToS section 2). Uses the rates in regions.js, so
// update those rates first if the market has moved.
//   node scripts/check-map.mjs
import { regions, getRegionPrices, MAP_FLOOR_USD } from '../src/i18n/regions.js';
const usd = regions.us.rate;
let bad = 0;
for (const k of Object.keys(regions)) {
  const p = getRegionPrices(k), r = regions[k].rate;
  const row = Object.keys(MAP_FLOOR_USD).map((id) => {
    const floor = k === 'us' ? MAP_FLOOR_USD[id] : Math.ceil((MAP_FLOOR_USD[id] * r) / usd);
    const ok = p[id] >= floor; if (!ok) bad++;
    return `${id} ${p[id]} (floor ${floor})${ok ? '' : ' LOW'}`;
  });
  console.log(k.padEnd(3), row.join('  '));
}
if (bad) { console.error(`\n${bad} price(s) under the floor`); process.exit(1); }
console.log('\nAll plan prices at or above the floors.');
