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
 * Retention assumption behind the five-year projection: 97% of clients staying
 * each month.
 *
 * Deliberately optimistic and defensible rather than zero. Note the page does
 * NOT claim a measured retention figure — DUSA has not been running long
 * enough to have one, and an unsubstantiated stat is the sort of claim that
 * gets challenged. It makes the qualitative point instead: clients who leave
 * are usually businesses that closed, not businesses that switched.
 */
export const DEFAULT_CHURN = 0.03;

/**
 * Sales-per-month the projection opens on. Four is roughly one a week, which
 * is a realistic pace for someone doing this alongside other work. Ten was a
 * full-time figure on a page selling a side income, which did not add up.
 */
export const DEFAULT_SALES_PER_MONTH = 4;

/**
 * Share of clients who take the 12-months-upfront deal.
 *
 * Published benchmarks: where monthly is the default choice under 20% of
 * customers pick annual; where annual is the default it is 40-60%. DUSA sits
 * in between because a seller pitches it directly rather than leaving it to a
 * pricing page, so 30% is the defensible middle. Adjustable on the page.
 */
export const DEFAULT_ANNUAL_SHARE = 0.30;

/**
 * Annual clients churn slower than monthly ones. Published SaaS cohort data
 * puts the suppression at 40-60%; we model the conservative end.
 */
export const ANNUAL_CHURN_FACTOR = 0.5;

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
