/**
 * DUSA.studio — i18n helpers
 *
 * Central entry point for translations and region config.
 */

export { regions, getRegion, convertPrice, formatPrice, getRegionPrices } from './regions.js';
export { t, getLangFromRegion, getDict } from './t.js';

import en from './translations/en.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

const translations = { en, es, pt, fr, de };

/**
 * Get the translation object for a language code.
 * Falls back to English if the language is not found.
 *
 * @param {string} lang — language code, e.g. 'en', 'es', 'pt', 'fr', 'de'
 * @returns {object} translation strings
 */
export function getTranslation(lang) {
  return translations[lang] || translations.en;
}
