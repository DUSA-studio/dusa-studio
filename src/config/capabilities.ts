// The capability model behind the Connected Platform wheel.
//
// `ai: true` marks a capability that is AI-powered. Reef Aqua is reserved for
// exactly these, so the "AI across everything" band is evidenced by named
// features rather than asserted.
//
// `d` is a plain-English one-liner shown in the hub when the segment is
// hovered, and also rendered as visually-hidden text so the whole model is
// readable by screen readers and crawlers.

export interface Capability { l: string; d: string; ai?: boolean }
export interface Domain { name: string; color: string; items: Capability[] }

export const DOMAINS: Domain[] = [
  {
    name: 'Capture',
    color: '#A8DCF2',
    items: [
      { l: 'Funnels &\nlanding pages', d: 'Pages built to turn visitors into leads' },
      { l: 'Websites\n& blogs', d: 'Your whole site, hosted and editable' },
      { l: 'Forms &\nsurveys', d: 'Capture details and feedback anywhere' },
      { l: 'Chat widget', d: 'Answers questions on your site, day or night', ai: true },
      { l: 'Missed-call\ntext back', d: 'Every missed call gets an instant text' },
    ],
  },
  {
    name: 'Sales & Payments',
    color: '#8ECBEA',
    items: [
      { l: 'CRM &\npipelines', d: 'See every deal and what happens next' },
      { l: 'Booking &\ncalendars', d: 'Let clients book without the back and forth' },
      { l: 'Estimates\n& invoices', d: 'Quote and bill without leaving the platform' },
      { l: 'Payment\nlinks', d: 'Get paid with a link you can text' },
      { l: 'Subscriptions', d: 'Recurring billing that runs itself' },
    ],
  },
  {
    name: 'Conversations',
    color: '#73B9E1',
    items: [
      { l: 'Unified\ninbox', d: 'Every channel in one conversation view' },
      { l: 'Email', d: 'Send, reply and track from one place' },
      { l: 'SMS & MMS', d: 'Two-way texting with your customers' },
      { l: 'Conversation\nAI', d: 'Replies to enquiries and books the job', ai: true },
      { l: 'Voice AI', d: 'Answers the phone when you cannot', ai: true },
    ],
  },
  {
    name: 'Marketing & Social',
    color: '#59A7D6',
    items: [
      { l: 'Email\ncampaigns', d: 'Broadcasts and nurture sequences' },
      { l: 'Social\nplanner', d: 'Schedule every channel from one calendar' },
      { l: 'Content AI', d: 'Drafts posts, emails and copy for you', ai: true },
      { l: 'Memberships\n& courses', d: 'Sell and deliver content to your clients' },
    ],
  },
  {
    name: 'Automation',
    color: '#4295C9',
    items: [
      { l: 'Workflows\n& triggers', d: 'Set the rules once, it runs forever' },
      { l: 'Smart\nfollow-up', d: 'Chases every lead until they reply', ai: true },
      { l: 'Lead\nrouting', d: 'Sends each enquiry to the right person' },
      { l: 'Task\nautomation', d: 'Creates the jobs your team needs to do' },
    ],
  },
  {
    name: 'Reputation',
    color: '#2E82B6',
    items: [
      { l: 'Review\nrequests', d: 'Asks happy customers at the right moment' },
      { l: 'AI review\nreplies', d: 'Responds to reviews in your tone', ai: true },
      { l: 'Dashboards', d: 'See what is working at a glance' },
      { l: 'Attribution', d: 'Know which channel produced the lead' },
    ],
  },
];
