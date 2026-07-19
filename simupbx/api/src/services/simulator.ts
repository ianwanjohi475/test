// Live simulation engine (SIMULATE=1): drives the whole system in real time
// on a desktop with no telco account — incoming calls ring the softphone,
// transcripts stream, missed calls trigger inbox follow-ups, presence moves.
// Every event flows through the same DB rows and WebSocket broadcasts the
// real providers use, so going live is only a matter of adding credentials.

import { q, one } from '../db/index.js';
import { summarizeCall } from './ai.js';

type Broadcast = (event: string, data: unknown) => void;

const CALLERS = [
  { name: 'Peter Kamau', company: 'Kamau Hardware Ltd', phone: '+254722184220', topic: 'cement order and delivery' },
  { name: 'Susan Njeri', company: 'Njeri & Co Advocates', phone: '+254733902118', topic: 'invoice correction' },
  { name: 'Jane Achieng', company: null, phone: '+254711334556', topic: 'product catalogue enquiry' },
  { name: 'George Omondi', company: 'Omondi Motors', phone: '+254728445671', topic: 'spare parts order' },
  { name: 'Esther Chebet', company: null, phone: '+254719883402', topic: 'solar panel installation quote' },
  { name: 'Mohammed Ali', company: 'Coast Logistics', phone: '+254700456789', topic: 'container clearance status' },
];

const SCRIPTS: Record<string, { speaker: 'them' | 'you'; text: string }[]> = {
  'cement order and delivery': [
    { speaker: 'them', text: 'Habari! Nauliza kuhusu order yangu ya cement, iko ready?' },
    { speaker: 'you', text: 'Peter! Yes, your 40 bags are packed and ready for delivery.' },
    { speaker: 'them', text: 'Perfect. Can you deliver Friday morning before ten?' },
    { speaker: 'you', text: 'Friday 8 to 11am works. Shall I send the M-Pesa prompt for the balance?' },
    { speaker: 'them', text: 'Sawa, send it — KES 46,500 ndio balance, sindio?' },
    { speaker: 'you', text: 'Exactly. Sending the STK push now, check your phone.' },
    { speaker: 'them', text: 'Imefika... done, paid. Asante sana!' },
  ],
  default: [
    { speaker: 'them', text: 'Hello, nilikuwa nauliza kuhusu services zenu.' },
    { speaker: 'you', text: 'Karibu! Happy to help — what would you like to know?' },
    { speaker: 'them', text: 'Bei yako ni ngapi, and do you deliver within Nairobi?' },
    { speaker: 'you', text: 'Yes we deliver — free within Nairobi for orders above ten thousand.' },
    { speaker: 'them', text: 'Nice. Send me the full price list on WhatsApp please.' },
    { speaker: 'you', text: 'On it — you will have it in a minute. Anything else?' },
    { speaker: 'them', text: 'That is all for now. Asante!' },
  ],
};

interface ActiveCall {
  callId: number;
  timeoutHandles: ReturnType<typeof setTimeout>[];
  answered: boolean;
}

const active = new Map<number, ActiveCall>();

export async function seedDemoData(): Promise<void> {
  const existing = await one('SELECT id FROM contacts LIMIT 1');
  if (existing) return;
  for (const c of CALLERS) {
    await q(
      `INSERT INTO contacts (name, company, phone, tags) VALUES ($1,$2,$3,$4)
       ON CONFLICT (phone) DO NOTHING`,
      [c.name, c.company, c.phone, c.company ? ['customer'] : ['lead']],
    );
  }
  await q(
    `INSERT INTO kb_entries (question, answer) VALUES
     ('What are your opening hours?', 'Mon-Fri 8am-6pm, Saturday 9am-1pm. Closed Sundays and public holidays.'),
     ('Where are you located?', 'Enterprise Road, Industrial Area, Nairobi.'),
     ('Do you deliver?', 'Yes - free delivery within Nairobi for orders above KES 10,000.'),
     ('Bei ya cement ni ngapi?', 'Cement ni KES 780 kwa bag ya 50kg, na discount kwa orders za zaidi ya 100 bags.')`,
  );
}

export function startSimulator(broadcast: Broadcast): void {
  // Presence drift so the Team page breathes.
  setInterval(() => {
    const states = ['available', 'oncall', 'ringing', 'away'];
    broadcast('presence.sim', {
      extension: String(101 + Math.floor(Math.random() * 5)),
      presence: states[Math.floor(Math.random() * states.length)],
    });
  }, 18_000);

  // A live inbound call every ~35-55 seconds.
  const scheduleNext = () => setTimeout(fireCall, 35_000 + Math.random() * 20_000);

  async function fireCall(): Promise<void> {
    try {
      const caller = CALLERS[Math.floor(Math.random() * CALLERS.length)];
      const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [caller.phone]);
      const [row] = await q<{ id: string }>(
        `INSERT INTO calls (direction, from_e164, to_e164, via_number, contact_id, status, queue)
         VALUES ('inbound',$1,'+254709100100','+254709100100',$2,'ringing','sales') RETURNING id`,
        [caller.phone, contact?.id ?? null],
      );
      const callId = Number(row.id); // pg returns BIGSERIAL as a string
      const call: ActiveCall = { callId, timeoutHandles: [], answered: false };
      active.set(callId, call);

      broadcast('call.incoming', {
        callId,
        name: caller.name,
        number: caller.phone,
        company: caller.company,
        screening: `Zuri screened: calling about ${caller.topic}. Known ${contact ? 'contact' : 'new caller'} — sounds friendly.`,
      });

      // Unanswered after 20s → missed + auto follow-up in the inbox.
      call.timeoutHandles.push(
        setTimeout(async () => {
          if (call.answered) return;
          active.delete(callId);
          await q(`UPDATE calls SET status='missed', ended_at=now(), tags=array_append(tags,'auto-followup-sent') WHERE id=$1`, [callId]);
          const [msg] = await q(
            `INSERT INTO messages (contact_id, channel, direction, e164, body)
             VALUES ($1,'whatsapp','auto',$2,$3) RETURNING *`,
            [contact?.id ?? null, caller.phone,
             `Sorry we missed your call, ${caller.name.split(' ')[0]}! Reply here or tap to call back — we'll sort out your ${caller.topic}.`],
          );
          broadcast('call.missed', { callId, name: caller.name });
          broadcast('inbox.message', { ...msg, contact_name: caller.name });
          scheduleNext();
        }, 20_000),
      );
    } catch {
      scheduleNext();
    }
  }

  setTimeout(fireCall, 8_000); // first call shortly after boot

  // Answer/hangup hooks used by the /sim routes below.
  simulatorControl.answer = async (callId: number) => {
    const call = active.get(callId);
    if (!call || call.answered) return false;
    call.answered = true;
    call.timeoutHandles.forEach(clearTimeout);
    await q(`UPDATE calls SET status='answered', answered_at=now() WHERE id=$1`, [callId]);

    const row = await one<{ from_e164: string }>('SELECT from_e164 FROM calls WHERE id=$1', [callId]);
    const caller = CALLERS.find((c) => c.phone === row?.from_e164);
    const script = SCRIPTS[caller?.topic ?? ''] ?? SCRIPTS.default;
    const startedAt = Date.now();
    const transcript: { speaker: string; at: string; text: string }[] = [];

    script.forEach((line, i) => {
      call.timeoutHandles.push(
        setTimeout(async () => {
          const at = new Date(Date.now() - startedAt).toISOString().slice(14, 19);
          const speaker = line.speaker === 'them' ? (caller?.name ?? 'Caller') : 'You';
          transcript.push({ speaker, at, text: line.text });
          broadcast('call.transcript', { callId, speaker, at, text: line.text });
          if (line.speaker === 'them' && i === 2) {
            broadcast('call.assist', {
              callId,
              text: 'Suggested: confirm delivery window, then offer to settle the balance via M-Pesa STK push now.',
            });
          }
          if (i === script.length - 1) {
            // Wrap up 4s after the last line.
            call.timeoutHandles.push(
              setTimeout(() => simulatorControl.hangup(callId, transcript), 4_000),
            );
          }
        }, 3_000 + i * 4_000),
      );
    });
    return true;
  };

  simulatorControl.hangup = async (callId, transcript = []) => {
    const call = active.get(callId);
    if (!call) return;
    call.timeoutHandles.forEach(clearTimeout);
    active.delete(callId);
    const durationSec = transcript.length ? 3 + transcript.length * 4 : 5;
    const summary = (await summarizeCall(transcript.map((t) => ({ speaker: t.speaker, text: t.text })))) ?? {
      bullets: ['Caller discussed their order and confirmed next steps.', 'Payment to be settled via M-Pesa.'],
      action_items: ['Follow up to confirm delivery'],
      sentiment: 'positive' as const,
    };
    await q(
      `UPDATE calls SET status='answered', ended_at=now(), duration_sec=$2, transcript=$3, summary=$4 WHERE id=$1`,
      [callId, durationSec, JSON.stringify(transcript), JSON.stringify(summary)],
    );
    broadcast('call.ended', { callId, summary });
    setTimeout(fireCall, 25_000 + Math.random() * 20_000);
  };
}

export const simulatorControl: {
  answer: (callId: number) => Promise<boolean>;
  hangup: (callId: number, transcript?: { speaker: string; at: string; text: string }[]) => Promise<void>;
} = {
  answer: async () => false,
  hangup: async () => undefined,
};
