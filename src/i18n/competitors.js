/**
 * DUSA.studio — Regional competitor configuration
 *
 * Maps each region to the most popular CRM/marketing/automation
 * tools in that market, ordered by local relevance.
 * Used for dynamic comparison display on pricing and blog pages.
 */

export const regionalCompetitors = {
  au: {
    label: 'Australia',
    competitors: [
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 50, popular: true },
      { name: 'ActiveCampaign', slug: 'dusa-vs-activecampaign', monthlyCost: 29, popular: true },
      { name: 'Mailchimp', slug: 'dusa-vs-mailchimp', monthlyCost: 20, popular: true },
      { name: 'Keap', slug: 'dusa-vs-keap', monthlyCost: 249, popular: false },
      { name: 'ClickFunnels', slug: 'dusa-vs-clickfunnels', monthlyCost: 147, popular: false },
      { name: 'Salesforce', slug: null, monthlyCost: 75, popular: false },
    ],
  },
  us: {
    label: 'United States',
    competitors: [
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 50, popular: true },
      { name: 'Mailchimp', slug: 'dusa-vs-mailchimp', monthlyCost: 20, popular: true },
      { name: 'ActiveCampaign', slug: 'dusa-vs-activecampaign', monthlyCost: 29, popular: true },
      { name: 'ClickFunnels', slug: 'dusa-vs-clickfunnels', monthlyCost: 147, popular: true },
      { name: 'Keap', slug: 'dusa-vs-keap', monthlyCost: 249, popular: false },
      { name: 'Salesforce', slug: null, monthlyCost: 75, popular: false },
    ],
  },
  uk: {
    label: 'United Kingdom',
    competitors: [
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 42, popular: true },
      { name: 'Mailchimp', slug: 'dusa-vs-mailchimp', monthlyCost: 17, popular: true },
      { name: 'ActiveCampaign', slug: 'dusa-vs-activecampaign', monthlyCost: 24, popular: true },
      { name: 'Keap', slug: 'dusa-vs-keap', monthlyCost: 199, popular: false },
      { name: 'ClickFunnels', slug: 'dusa-vs-clickfunnels', monthlyCost: 119, popular: false },
      { name: 'Salesforce', slug: null, monthlyCost: 60, popular: false },
    ],
  },
  es: {
    label: 'Spain',
    competitors: [
      { name: 'Clientify', slug: null, monthlyCost: 39, popular: true, local: true },
      { name: 'Holded', slug: null, monthlyCost: 29, popular: true, local: true },
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 45, popular: true },
      { name: 'Efficy', slug: null, monthlyCost: 25, popular: false, local: true },
      { name: 'Zoho CRM', slug: null, monthlyCost: 20, popular: true },
      { name: 'Mailchimp', slug: 'dusa-vs-mailchimp', monthlyCost: 18, popular: false },
    ],
  },
  mx: {
    label: 'Mexico',
    competitors: [
      { name: 'Clientify', slug: null, monthlyCost: 690, popular: true, local: true },
      { name: 'Bitrix24', slug: null, monthlyCost: 0, popular: true },
      { name: 'Pipedrive', slug: null, monthlyCost: 280, popular: true },
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 870, popular: true },
      { name: 'Freshsales', slug: null, monthlyCost: 340, popular: false },
      { name: 'Leadsales', slug: null, monthlyCost: 499, popular: false, local: true },
    ],
  },
  br: {
    label: 'Brazil',
    competitors: [
      { name: 'RD Station', slug: null, monthlyCost: 79, popular: true, local: true },
      { name: 'Pipedrive', slug: null, monthlyCost: 59, popular: true },
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 170, popular: true },
      { name: 'Conta Azul', slug: null, monthlyCost: 89, popular: false, local: true },
      { name: 'ActiveCampaign', slug: 'dusa-vs-activecampaign', monthlyCost: 99, popular: false },
      { name: 'Zoho CRM', slug: null, monthlyCost: 49, popular: false },
    ],
  },
  fr: {
    label: 'France',
    competitors: [
      { name: 'Sellsy', slug: null, monthlyCost: 29, popular: true, local: true },
      { name: 'Axonaut', slug: null, monthlyCost: 35, popular: true, local: true },
      { name: 'Brevo', slug: null, monthlyCost: 25, popular: true, local: true },
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 45, popular: true },
      { name: 'Karlia', slug: null, monthlyCost: 29, popular: false, local: true },
      { name: 'Mailchimp', slug: 'dusa-vs-mailchimp', monthlyCost: 18, popular: false },
    ],
  },
  de: {
    label: 'Germany',
    competitors: [
      { name: 'Pipedrive', slug: null, monthlyCost: 14, popular: true },
      { name: 'weclapp', slug: null, monthlyCost: 39, popular: true, local: true },
      { name: 'CentralStationCRM', slug: null, monthlyCost: 15, popular: true, local: true },
      { name: 'HubSpot', slug: 'dusa-vs-hubspot', monthlyCost: 45, popular: true },
      { name: 'Brevo', slug: null, monthlyCost: 25, popular: false },
      { name: 'CAS Software', slug: null, monthlyCost: 35, popular: false, local: true },
    ],
  },
};

/**
 * Get competitors for a region, sorted by relevance.
 * Local competitors are prioritised first, then popular ones.
 * @param {string} regionKey — e.g. 'es', 'de', 'br'
 * @returns {Array} sorted competitor list
 */
export function getRegionalCompetitors(regionKey) {
  const region = regionalCompetitors[regionKey] || regionalCompetitors.au;
  return [...region.competitors].sort((a, b) => {
    // Local competitors first
    if (a.local && !b.local) return -1;
    if (!a.local && b.local) return 1;
    // Then popular ones
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return 0;
  });
}

/**
 * Get the top N competitors for a region.
 * @param {string} regionKey
 * @param {number} count — how many to return (default 3)
 * @returns {Array}
 */
export function getTopCompetitors(regionKey, count = 3) {
  return getRegionalCompetitors(regionKey).slice(0, count);
}

/**
 * Get competitor names as a formatted string for display.
 * @param {string} regionKey
 * @param {number} count
 * @returns {string} e.g. "Clientify, Holded, and HubSpot"
 */
export function getCompetitorNames(regionKey, count = 3) {
  const top = getTopCompetitors(regionKey, count);
  if (top.length <= 1) return top[0]?.name || '';
  const last = top.pop();
  return `${top.map(c => c.name).join(', ')}, and ${last.name}`;
}
