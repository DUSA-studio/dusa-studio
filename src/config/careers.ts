// The sales contractor commission model.
//
// Single source of truth for the careers page: the calculator, the rate cards
// and the terms copy all read from here, so a rate can never be right in one
// place and stale in another.
//
// Terms below are Eliah's, from the 2026-08-29 affiliate spec. Do not soften
// or embellish them — a commission-only role has to be described accurately or
// it costs you the good applicants and attracts the wrong ones.

/** Commission share of license revenue paid to the seller. */
export const SHARE = 0.4;

/**
 * Annual-upfront customers pay a discounted rate equal to 10 months rather
 * than 12. The seller's 40% is calculated on what the customer actually pays.
 */
export const ANNUAL_MONTHS_CHARGED = 10;

/** Minimum sales to stay active, averaged across a rolling quarter. */
export const QUOTA_PER_QUARTER = 3;

export interface Plan {
  id: string;
  name: string;
  /** Monthly list price in AUD. Must track src/i18n/regions.js base prices. */
  price: number;
  blurb: string;
}

export const PLANS: Plan[] = [
  { id: 'launchpad', name: 'Launchpad', price: 47,  blurb: 'One core system' },
  { id: 'starter',   name: 'Starter',   price: 149, blurb: 'The full platform' },
  { id: 'growth',    name: 'Growth',    price: 297, blurb: 'Unlimited plus AI' },
];

/**
 * Retention assumption behind the five-year projection.
 *
 * Kept in the model but out of the spotlight: it sits behind an "assumptions"
 * disclosure rather than as a headline input. A compounding projection with no
 * attrition at all would overstate the numbers, and the people worth hiring
 * will do the maths and notice. 3% a month is a reasonable small business SaaS
 * assumption, not a DUSA measurement — we do not have the history to claim one.
 */
export const DEFAULT_CHURN = 0.03;

/** How many years the compounding projection runs. */
export const PROJECTION_YEARS = 5;

/** What a contractor needs in place before they can invoice us, by region. */
export interface Requirement { region: string; needs: string }
export const REQUIREMENTS: Requirement[] = [
  { region: 'Australia',
    needs: 'An active ABN. You invoice us, so you need to be able to raise one. Register for GST if your turnover puts you over the threshold.' },
  { region: 'New Zealand',
    needs: 'An IRD number and a registered sole trader or company setup that can invoice an Australian business.' },
  { region: 'United Kingdom',
    needs: 'Registered as a sole trader with HMRC, or an incorporated company, with a UTR.' },
  { region: 'Anywhere else',
    needs: 'Whatever your country calls its version: a registered business or sole trader arrangement that can legally invoice an Australian company, plus the right to work where you live.' },
];

export const money = (n: number) =>
  '$' + n.toLocaleString('en-AU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

/** What one client on this plan pays the seller each month, ongoing. */
export const monthly = (p: Plan) => p.price * SHARE;

/** What one annual-upfront sale on this plan pays the seller, immediately. */
export const upfront = (p: Plan) => p.price * ANNUAL_MONTHS_CHARGED * SHARE;
