// The scattered-tools stack behind the home page cost comparison.
//
// Same eight tools and prices as the pricing page table and the old pill
// funnel (commit 912adc1): one seat, billed monthly, small-business tier,
// USD list × 1.40 ≈ AUD, Sept 2026. The total is computed, never typed, so
// the headline can never drift from the column again.

export interface StackTool {
  name: string;
  cost: number;
  /** What the tool is actually for, so the reader sees the overlap. */
  job: string;
}

export const STACK: StackTool[] = [
  { name: 'Birdeye',       cost: 489, job: 'Reviews' },
  { name: 'Skool',         cost: 139, job: 'Courses' },
  { name: 'ClickFunnels',  cost: 136, job: 'Funnels' },
  { name: 'Mailchimp',     cost: 84,  job: 'Email' },
  { name: 'SimpleTexting', cost: 55,  job: 'SMS' },
  { name: 'Zapier',        cost: 42,  job: 'Automation' },
  { name: 'HubSpot',       cost: 28,  job: 'CRM' },
  { name: 'Calendly',      cost: 17,  job: 'Booking' },
];

export const DUSA_COST = 149;

export const STACK_TOTAL = STACK.reduce((n, t) => n + t.cost, 0);
export const SAVING = STACK_TOTAL - DUSA_COST;
/** How many times more the scattered stack costs. One decimal place. */
export const MULTIPLE = Math.round((STACK_TOTAL / DUSA_COST) * 10) / 10;

export const money = (n: number) => '$' + n.toLocaleString('en-AU');
