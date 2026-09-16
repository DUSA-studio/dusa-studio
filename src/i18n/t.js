/**
 * DUSA.studio — Translation lookup utility
 *
 * t(lang, key) — dot-notation lookup with English fallback
 * getLangFromRegion(regionKey) — get language code from region key
 */

import en from './translations/en.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import fr from './translations/fr.json';
import de from './translations/de.json';
import it from './translations/it.json';
import nl from './translations/nl.json';
import sv from './translations/sv.json';
import da from './translations/da.json';
import fi from './translations/fi.json';
import nb from './translations/nb.json';

const translations = { en, es, pt, fr, de, it, nl, sv, da, fi, nb };

/**
 * Resolve a dot-notation key against a translation object.
 * Returns undefined if not found.
 *
 * @param {object} obj
 * @param {string} key — e.g. 'nav.pricing', 'hero.title'
 * @returns {string|undefined}
 */
function resolve(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * Get a translated string.
 * Falls back to English if the key is missing in the target language.
 * Returns the key itself if not found even in English (fail-safe).
 *
 * @param {string} lang — e.g. 'es', 'pt', 'fr', 'de', 'en'
 * @param {string} key — dot-notation key, e.g. 'nav.pricing'
 * @returns {string}
 */
export function t(lang, key) {
  const dict = translations[lang] || translations.en;
  const val = resolve(dict, key);
  if (val !== undefined) return val;
  // Fallback to English
  const fallback = resolve(translations.en, key);
  if (fallback !== undefined) return fallback;
  // Last resort: return the key
  return key;
}

/**
 * Map region key to language code.
 * Mirrors the lang field in regions.js.
 *
 * @param {string} regionKey — e.g. 'au', 'es', 'mx', 'br', 'fr', 'de'
 * @returns {string} language code
 */
export function getLangFromRegion(regionKey) {
  const map = {
    au: 'en',
    us: 'en',
    uk: 'en',
    es: 'es',
    mx: 'es',
    br: 'pt',
    fr: 'fr',
    de: 'de',
    it: 'it',
    nl: 'nl',
    se: 'sv',
    dk: 'da',
    fi: 'fi',
    no: 'nb',
  };
  return map[regionKey] || 'en';
}

/**
 * Get the full translation object for a language.
 * Useful when you want to pass the whole dict into a component.
 *
 * @param {string} lang
 * @returns {object}
 */
export function getDict(lang) {
  return translations[lang] || translations.en;
}
