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
      { l: 'Funnels &\nlanding pages', d: 'Turn visitors into booked leads' },
      { l: 'Websites\n& blogs', d: 'Your whole site in one place' },
      { l: 'Forms &\nsurveys', d: 'Capture what you need to know' },
      { l: 'Chat widget', d: 'Answers visitors around the clock', ai: true },
      { l: 'Missed-call\ntext back', d: 'Never lose a missed call again' },
    ],
  },
  {
    name: 'Sales & Payments',
    color: '#8ECBEA',
    items: [
      { l: 'CRM &\npipelines', d: 'See every deal and what\'s next' },
      { l: 'Booking &\ncalendars', d: 'Clients book without the back and forth' },
      { l: 'Estimates\n& invoices', d: 'Quote and bill in one place' },
      { l: 'Payment\nlinks', d: 'Get paid with a link you text' },
      { l: 'Subscriptions', d: 'Recurring revenue on autopilot' },
    ],
  },
  {
    name: 'Conversations',
    color: '#73B9E1',
    items: [
      { l: 'Unified\ninbox', d: 'Every channel, one conversation' },
      { l: 'Email', d: 'Send, reply and track in one place' },
      { l: 'SMS & MMS', d: 'Two-way texting that gets read' },
      { l: 'Conversation\nAI', d: 'Replies and books while you work', ai: true },
      { l: 'Voice AI', d: 'Answers the phone when you can\'t', ai: true },
    ],
  },
  {
    name: 'Marketing & Social',
    color: '#59A7D6',
    items: [
      { l: 'Email\ncampaigns', d: 'Broadcasts and nurture that convert' },
      { l: 'Social\nplanner', d: 'Every channel, one calendar' },
      { l: 'Content AI', d: 'Drafts your posts and emails', ai: true },
      { l: 'Memberships\n& courses', d: 'Sell and deliver your knowledge' },
    ],
  },
  {
    name: 'Automation',
    color: '#4295C9',
    items: [
      { l: 'Workflows\n& triggers', d: 'Set it once, it runs forever' },
      { l: 'Smart\nfollow-up', d: 'Chases every lead until they reply', ai: true },
      { l: 'Lead\nrouting', d: 'Right enquiry, right person, instantly' },
      { l: 'Task\nautomation', d: 'Work that assigns itself' },
    ],
  },
  {
    name: 'Reputation',
    color: '#2E82B6',
    items: [
      { l: 'Review\nrequests', d: 'More 5-star reviews, automatically' },
      { l: 'AI review\nreplies', d: 'Every review answered in your voice', ai: true },
      { l: 'Dashboards', d: 'See what\'s working at a glance' },
      { l: 'Attribution', d: 'Know which channel wins' },
    ],
  },
];
