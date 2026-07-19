/**
 * DUSA.studio — Region configuration and currency conversion
 *
 * Base prices are in AUD. Each region has a conversion rate,
 * currency symbol, and locale for formatting.
 */

export const regions = {
  au: { lang: 'en', label: 'Australia', currency: 'AUD', symbol: '$', flag: '\u{1F1E6}\u{1F1FA}', locale: 'en-AU', htmlLang: 'en-AU', ogLocale: 'en_AU', rate: 1 },
  us: { lang: 'en', label: 'United States', currency: 'USD', symbol: '$', flag: '\u{1F1FA}\u{1F1F8}', locale: 'en-US', htmlLang: 'en-US', ogLocale: 'en_US', rate: 0.67 },
  uk: { lang: 'en', label: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '\u{1F1EC}\u{1F1E7}', locale: 'en-GB', htmlLang: 'en-GB', ogLocale: 'en_GB', rate: 0.52 },
  es: { lang: 'es', label: 'España', currency: 'EUR', symbol: '€', flag: '\u{1F1EA}\u{1F1F8}', locale: 'es-ES', htmlLang: 'es', ogLocale: 'es_ES', rate: 0.61 },
  mx: { lang: 'es', label: 'México', currency: 'MXN', symbol: '$', flag: '\u{1F1F2}\u{1F1FD}', locale: 'es-MX', htmlLang: 'es', ogLocale: 'es_MX', rate: 11.5 },
  br: { lang: 'pt', label: 'Brasil', currency: 'BRL', symbol: 'R$', flag: '\u{1F1E7}\u{1F1F7}', locale: 'pt-BR', htmlLang: 'pt', ogLocale: 'pt_BR', rate: 3.45 },
  fr: { lang: 'fr', label: 'France', currency: 'EUR', symbol: '€', flag: '\u{1F1EB}\u{1F1F7}', locale: 'fr-FR', htmlLang: 'fr', ogLocale: 'fr_FR', rate: 0.61 },
  de: { lang: 'de', label: 'Deutschland', currency: 'EUR', symbol: '€', flag: '\u{1F1E9}\u{1F1EA}', locale: 'de-DE', htmlLang: 'de', ogLocale: 'de_DE', rate: 0.61 },
};

/**
 * Get a region configuration by key.
 * @param {string} regionKey — e.g. 'us', 'es', 'au'
 * @returns {object} region config
 */
export function getRegion(regionKey) {
  return regions[regionKey] || regions.au;
}

/**
 * Manual price overrides for specific regions.
 * Use this when the algorithm produces a number that
 * does not feel right and you want to pin an exact price.
 * Key format: "regionKey-audPrice" => pinned price.
 */
const priceOverrides = {
  'us-149': 99,
  'us-297': 199,
};

/**
 * Convert an AUD base price to the target region's currency.
 *
 * Algorithm:
 * 1. Check for a manual override first
 * 2. Convert: basePrice * rate
 * 3. Add 5% buffer: converted * 1.05
 * 4. Round to attractive number (nearest 5 or 9 ending)
 *
 * For AUD (rate=1), returns the original price unchanged.
 *
 * @param {number} audPrice — base price in AUD (e.g. 47, 149, 297)
 * @param {string} regionKey — e.g. 'us', 'es', 'mx'
 * @returns {number} converted and rounded price
 */
export function convertPrice(audPrice, regionKey) {
  const region = getRegion(regionKey);
  if (region.rate === 1) return audPrice;

  // Check for manual override
  const overrideKey = `${regionKey}-${audPrice}`;
  if (priceOverrides[overrideKey] !== undefined) {
    return priceOverrides[overrideKey];
  }

  const converted = audPrice * region.rate;
  const buffered = converted * 1.05;

  return roundToAttractive(buffered);
}

/**
 * Round a price to the nearest "attractive" number.
 * Attractive endings are 5 or 9 in the ones digit.
 * Picks whichever of the two candidates is closest.
 *
 * Examples:
 *   31.35 -> 29     (29 is closer than 35)
 *   99.45 -> 99     (99 is closer than 105)
 *   198.9 -> 199    (199 is closer than 195)
 *   33.07 -> 35     (35 is closer than 29)
 */
function roundToAttractive(n) {
  const rounded = Math.round(n);

  // Find nearest ending-in-5 and ending-in-9
  const base = Math.floor(rounded / 10) * 10;
  const candidates = [base - 1, base + 5, base + 9, base + 15];

  let best = candidates[0];
  let bestDist = Math.abs(n - best);

  for (const c of candidates) {
    const dist = Math.abs(n - c);
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }

  return Math.max(best, 1);
}

/**
 * Format a price with the region's currency symbol.
 * @param {number} price — the converted price
 * @param {string} regionKey — e.g. 'us', 'es'
 * @returns {string} formatted price like "$29", "€95", "R$179"
 */
export function formatPrice(price, regionKey) {
  const region = getRegion(regionKey);
  return region.symbol + price;
}

/**
 * Get all three tier prices for a region, pre-converted.
 * @param {string} regionKey
 * @returns {{ launchpad: number, starter: number, growth: number }}
 */
export function getRegionPrices(regionKey) {
  return {
    launchpad: convertPrice(47, regionKey),
    starter: convertPrice(149, regionKey),
    growth: convertPrice(297, regionKey),
  };
}
