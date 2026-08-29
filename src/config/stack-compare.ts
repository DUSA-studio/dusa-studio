// The scattered-tools stack behind the cost comparison section.
//
// These are the numbers currently hardcoded in FunnelComparison.astro, lifted
// out unchanged so the three staging redesigns compare DESIGN and not data.
//
// NOTE: src/i18n/competitors.js already carries a per-region competitor list
// with different names AND different prices (HubSpot 50 vs 40, Mailchimp 20 vs
// 85, ClickFunnels 147 vs 135). The site is therefore quoting two different
// competitor sets in two places. Worth reconciling, but that is a data decision
// for Eliah, not something to fold silently into a visual redesign.
//
// Prices are plain numbers so a future pass can run them through
// regions.js convertPrice() instead of rendering a hardcoded "$".
//
// ⚠ The live section displays "$1,074/MO" but the eight tools it lists add up
// to $869. Nobody signed off on that $205 gap; it looks like the pill list was
// edited after the total was written. A prospect who adds the column up finds
// the discrepancy, which costs more credibility than the bigger number buys.
// These mockups compute the total from the data so it is always right. If the
// $1,074 figure is the one worth keeping, the stack needs the missing tools
// added rather than the total overwritten.

export interface StackTool {
  name: string;
  cost: number;
  /** What the tool is actually for, so the reader sees the overlap. */
  job: string;
}

export const STACK: StackTool[] = [
  { name: 'Birdeye',       cost: 349, job: 'Reviews' },
  { name: 'Skool',         cost: 139, job: 'Courses' },
  { name: 'ClickFunnels',  cost: 135, job: 'Funnels' },
  { name: 'Mailchimp',     cost: 85,  job: 'Email' },
  { name: 'SimpleTexting', cost: 55,  job: 'SMS' },
  { name: 'Zapier',        cost: 42,  job: 'Automation' },
  { name: 'HubSpot',       cost: 40,  job: 'CRM' },
  { name: 'Calendly',      cost: 24,  job: 'Booking' },
];

export const DUSA_COST = 149;

export const STACK_TOTAL = STACK.reduce((n, t) => n + t.cost, 0);
export const SAVING = STACK_TOTAL - DUSA_COST;
/** How many times more the scattered stack costs. One decimal place. */
export const MULTIPLE = Math.round((STACK_TOTAL / DUSA_COST) * 10) / 10;

export const money = (n: number) => '$' + n.toLocaleString('en-AU');
