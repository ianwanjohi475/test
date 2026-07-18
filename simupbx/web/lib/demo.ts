// Demo dataset shown when the API is not connected (sandbox / first run).
// Every page reads through lib/api.ts, which swaps this for live data
// automatically once NEXT_PUBLIC_API_URL responds.

export type Presence = 'available' | 'oncall' | 'ringing' | 'dnd' | 'away' | 'offline';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  ext: string;
  presence: Presence;
  queue?: string;
  callsToday: number;
  avgHandleSec: number;
}

export interface Contact {
  id: string;
  name: string;
  company?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  tags: string[];
  lastContacted: string;
  totalCalls: number;
  mpesaPaid?: number;
}

export interface CallRecord {
  id: string;
  direction: 'inbound' | 'outbound' | 'missed' | 'internal';
  contactName: string;
  number: string;
  via: string;
  agent: string;
  startedAt: string;
  durationSec: number;
  recorded: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  summary?: string[];
  actionItems?: string[];
  transcript?: { speaker: string; at: string; text: string }[];
  tags?: string[];
}

export interface Thread {
  id: string;
  contactName: string;
  number: string;
  channel: 'whatsapp' | 'sms';
  unread: number;
  messages: { from: 'them' | 'us' | 'auto'; text: string; at: string }[];
}

export interface Voicemail {
  id: string;
  contactName: string;
  number: string;
  at: string;
  durationSec: number;
  transcript: string;
  urgency: 'high' | 'normal' | 'low';
  urgencyReason?: string;
  listened: boolean;
}

export interface QueueLive {
  id: string;
  name: string;
  waiting: number;
  agentsReady: number;
  agentsBusy: number;
  avgWaitSec: number;
  serviceLevel: number;
  longestWaitSec: number;
}

export const me = {
  name: 'Ian Wanjohi',
  ext: '100',
  role: 'Admin',
  did: '+254 709 100 100',
  company: 'Wanjohi Group',
};

export const team: TeamMember[] = [
  { id: 't1', name: 'Ian Wanjohi', role: 'Admin · Founder', ext: '100', presence: 'available', callsToday: 12, avgHandleSec: 184 },
  { id: 't2', name: 'Amina Otieno', role: 'Sales Lead', ext: '101', presence: 'oncall', queue: 'Sales', callsToday: 23, avgHandleSec: 251 },
  { id: 't3', name: 'Brian Kiprop', role: 'Support Agent', ext: '102', presence: 'ringing', queue: 'Support', callsToday: 17, avgHandleSec: 312 },
  { id: 't4', name: 'Grace Muthoni', role: 'Support Agent', ext: '103', presence: 'available', queue: 'Support', callsToday: 19, avgHandleSec: 274 },
  { id: 't5', name: 'David Ochieng', role: 'Accounts', ext: '104', presence: 'dnd', callsToday: 6, avgHandleSec: 146 },
  { id: 't6', name: 'Faith Wambui', role: 'Sales Agent', ext: '105', presence: 'away', queue: 'Sales', callsToday: 14, avgHandleSec: 228 },
  { id: 't7', name: 'Zuri', role: 'AI Receptionist', ext: '900', presence: 'available', callsToday: 41, avgHandleSec: 47 },
];

export const contacts: Contact[] = [
  { id: 'c1', name: 'Peter Kamau', company: 'Kamau Hardware Ltd', phone: '+254 722 184 220', email: 'peter@kamauhw.co.ke', tags: ['customer', 'vip'], lastContacted: 'Today, 10:42', totalCalls: 34, mpesaPaid: 46500 },
  { id: 'c2', name: 'Susan Njeri', company: 'Njeri & Co Advocates', phone: '+254 733 902 118', email: 'susan@njerilaw.co.ke', tags: ['customer'], lastContacted: 'Today, 09:15', totalCalls: 12, mpesaPaid: 12000 },
  { id: 'c3', name: 'Mohammed Ali', company: 'Coast Logistics', phone: '+254 700 456 789', tags: ['supplier'], lastContacted: 'Yesterday', totalCalls: 8 },
  { id: 'c4', name: 'Jane Achieng', phone: '+254 711 334 556', email: 'jachieng@gmail.com', tags: ['lead', 'hot'], lastContacted: 'Yesterday', totalCalls: 3 },
  { id: 'c5', name: 'Samuel Mwangi', company: 'Mwangi Fresh Produce', phone: '+254 721 667 890', tags: ['customer'], lastContacted: 'Tue', totalCalls: 21, mpesaPaid: 8200 },
  { id: 'c6', name: 'Lucy Wanjiru', company: 'Serene Spa Westlands', phone: '+254 741 220 013', tags: ['lead'], lastContacted: 'Mon', totalCalls: 2 },
  { id: 'c7', name: 'George Omondi', company: 'Omondi Motors', phone: '+254 728 445 671', tags: ['customer', 'vip'], lastContacted: 'Mon', totalCalls: 45, mpesaPaid: 132000 },
  { id: 'c8', name: 'Esther Chebet', phone: '+254 719 883 402', tags: ['lead'], lastContacted: 'Last week', totalCalls: 1 },
];

export const calls: CallRecord[] = [
  {
    id: 'k1',
    direction: 'inbound',
    contactName: 'Peter Kamau',
    number: '+254 722 184 220',
    via: 'Nairobi Main · +254 709 100 100',
    agent: 'Amina Otieno',
    startedAt: 'Today, 10:42',
    durationSec: 438,
    recorded: true,
    sentiment: 'positive',
    summary: [
      'Peter confirmed the order of 40 bags of cement for Thika site, delivery Friday.',
      'Asked for a KES 46,500 invoice — paid via M-Pesa STK during the call.',
      'Wants a quote for steel doors by next week.',
    ],
    actionItems: ['Send steel door quote by Wed', 'Confirm Friday delivery window with logistics'],
    transcript: [
      { speaker: 'Zuri (AI)', at: '00:00', text: 'Habari! Thank you for calling Wanjohi Group. How can I help you today?' },
      { speaker: 'Peter Kamau', at: '00:06', text: 'Nataka kuongea na sales kuhusu order yangu ya cement.' },
      { speaker: 'Zuri (AI)', at: '00:11', text: 'Sawa Peter, connecting you to Amina in Sales. One moment.' },
      { speaker: 'Amina Otieno', at: '00:19', text: 'Peter! Good to hear from you. Your 40 bags are packed — shall we deliver Friday morning?' },
      { speaker: 'Peter Kamau', at: '00:27', text: 'Friday is perfect. Can I pay now? Send me the M-Pesa prompt.' },
      { speaker: 'Amina Otieno', at: '00:33', text: 'Sending the STK push for KES 46,500 now… you should see it on your phone.' },
      { speaker: 'Peter Kamau', at: '00:58', text: 'Done, paid. Also — I need a quote for steel doors, six of them.' },
    ],
    tags: ['sales', 'mpesa-paid'],
  },
  {
    id: 'k2',
    direction: 'inbound',
    contactName: 'Susan Njeri',
    number: '+254 733 902 118',
    via: 'Nairobi Main · +254 709 100 100',
    agent: 'Grace Muthoni',
    startedAt: 'Today, 09:15',
    durationSec: 305,
    recorded: true,
    sentiment: 'neutral',
    summary: [
      'Susan followed up on a delayed invoice correction from last week.',
      'Grace fixed the VAT line item on the call and re-sent the document.',
    ],
    actionItems: ['Confirm Susan received corrected invoice'],
    tags: ['support'],
  },
  {
    id: 'k3',
    direction: 'outbound',
    contactName: 'Jane Achieng',
    number: '+254 711 334 556',
    via: 'Sales Line · +254 709 100 200',
    agent: 'Faith Wambui',
    startedAt: 'Today, 08:47',
    durationSec: 178,
    recorded: true,
    sentiment: 'positive',
    summary: ['Callback from yesterday\'s missed call. Jane wants the full catalogue — sent via WhatsApp.'],
    tags: ['sales', 'callback'],
  },
  {
    id: 'k4',
    direction: 'missed',
    contactName: 'Mohammed Ali',
    number: '+254 700 456 789',
    via: 'Nairobi Main · +254 709 100 100',
    agent: '—',
    startedAt: 'Today, 08:12',
    durationSec: 0,
    recorded: false,
    tags: ['auto-followup-sent'],
  },
  {
    id: 'k5',
    direction: 'inbound',
    contactName: 'George Omondi',
    number: '+254 728 445 671',
    via: 'Mombasa Line · +254 709 100 300',
    agent: 'Zuri (AI)',
    startedAt: 'Yesterday, 17:38',
    durationSec: 96,
    recorded: true,
    sentiment: 'positive',
    summary: ['Zuri answered after hours, took a parts order message, and scheduled a callback for 8am.'],
    actionItems: ['Call George back at 8:00 — parts order'],
    tags: ['after-hours', 'zuri'],
  },
  {
    id: 'k6',
    direction: 'internal',
    contactName: 'Brian Kiprop',
    number: 'ext 102',
    via: 'Internal',
    agent: 'Ian Wanjohi',
    startedAt: 'Yesterday, 16:20',
    durationSec: 84,
    recorded: false,
  },
  {
    id: 'k7',
    direction: 'inbound',
    contactName: 'Samuel Mwangi',
    number: '+254 721 667 890',
    via: 'Nairobi Main · +254 709 100 100',
    agent: 'Brian Kiprop',
    startedAt: 'Yesterday, 14:05',
    durationSec: 512,
    recorded: true,
    sentiment: 'negative',
    summary: [
      'Samuel reported a double delivery charge on his last order.',
      'Brian confirmed the error and initiated a KES 1,200 refund.',
    ],
    actionItems: ['Verify refund lands by Thursday', 'QA: review billing rule for repeat orders'],
    tags: ['support', 'billing'],
  },
];

export const threads: Thread[] = [
  {
    id: 'm1',
    contactName: 'Mohammed Ali',
    number: '+254 700 456 789',
    channel: 'whatsapp',
    unread: 1,
    messages: [
      { from: 'auto', text: 'Sorry we missed your call, Mohammed! Reply here or tap to call back — Wanjohi Group', at: '08:12' },
      { from: 'them', text: 'Sawa, nilikuwa nauliza kama containers zangu zimefika?', at: '08:31' },
    ],
  },
  {
    id: 'm2',
    contactName: 'Jane Achieng',
    number: '+254 711 334 556',
    channel: 'whatsapp',
    unread: 0,
    messages: [
      { from: 'us', text: 'Hi Jane! Here is our full catalogue as promised 📎 catalogue_2026.pdf', at: '08:52' },
      { from: 'them', text: 'Asante! I will go through it this weekend 🙏', at: '09:14' },
    ],
  },
  {
    id: 'm3',
    contactName: 'Peter Kamau',
    number: '+254 722 184 220',
    channel: 'sms',
    unread: 0,
    messages: [
      { from: 'auto', text: 'WANJOHI GROUP: Payment of KES 46,500 received via M-Pesa (QGH7X21). Delivery Fri 8-11am. Asante!', at: '10:49' },
      { from: 'them', text: 'Received, thanks', at: '10:53' },
    ],
  },
];

export const voicemails: Voicemail[] = [
  {
    id: 'v1',
    contactName: 'Esther Chebet',
    number: '+254 719 883 402',
    at: 'Today, 07:58',
    durationSec: 42,
    transcript:
      'Habari, ni Esther kutoka Eldoret. Niliona advert yenu ya solar panels. Tafadhali nipigieni before lunch, niko na swali kuhusu bei ya installation.',
    urgency: 'high',
    urgencyReason: 'New lead requesting callback before midday — time-sensitive.',
    listened: false,
  },
  {
    id: 'v2',
    contactName: 'Unknown',
    number: '+254 796 001 224',
    at: 'Yesterday, 19:22',
    durationSec: 18,
    transcript: 'Hello, calling about a delivery… I will try again tomorrow morning. Thank you.',
    urgency: 'normal',
    listened: true,
  },
];

export const queuesLive: QueueLive[] = [
  { id: 'q1', name: 'Sales', waiting: 2, agentsReady: 1, agentsBusy: 2, avgWaitSec: 22, serviceLevel: 94, longestWaitSec: 41 },
  { id: 'q2', name: 'Support', waiting: 4, agentsReady: 1, agentsBusy: 1, avgWaitSec: 58, serviceLevel: 81, longestWaitSec: 122 },
  { id: 'q3', name: 'Accounts', waiting: 0, agentsReady: 1, agentsBusy: 0, avgWaitSec: 8, serviceLevel: 99, longestWaitSec: 0 },
];

export const todayStats = {
  totalCalls: 132,
  answered: 118,
  missed: 6,
  zuriHandled: 41,
  avgWaitSec: 31,
  mpesaCollected: 187300,
  activeCalls: 3,
  callbacksQueued: 2,
};

export const hourlyVolume = [
  { h: '8am', inbound: 9, outbound: 4 },
  { h: '9am', inbound: 14, outbound: 6 },
  { h: '10am', inbound: 18, outbound: 8 },
  { h: '11am', inbound: 16, outbound: 9 },
  { h: '12pm', inbound: 11, outbound: 5 },
  { h: '1pm', inbound: 7, outbound: 3 },
  { h: '2pm', inbound: 13, outbound: 7 },
  { h: '3pm', inbound: 15, outbound: 6 },
  { h: '4pm', inbound: 12, outbound: 5 },
];

export const weeklyOutcomes = [
  { d: 'Mon', answered: 96, missed: 7, zuri: 28 },
  { d: 'Tue', answered: 104, missed: 5, zuri: 33 },
  { d: 'Wed', answered: 88, missed: 9, zuri: 30 },
  { d: 'Thu', answered: 112, missed: 4, zuri: 38 },
  { d: 'Fri', answered: 118, missed: 6, zuri: 41 },
];
