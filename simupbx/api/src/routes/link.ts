// SimuPBX Link — use YOUR OWN phone + SIM as the line (KES 0).
// A free automation app on the phone (MacroDroid) does two things:
//   1. Reports events here:   POST /link/event?token=...   (ringing/missed/ended/sms)
//   2. Executes commands via its cloud webhook: we GET
//      <webhookBase>/simupbx-dial?number=...  and  /simupbx-sms?to=...&msg=...
// So incoming calls to the user's real number appear live in the app, missed
// calls auto-SMS from their SIM, and the app can make their phone dial out —
// caller ID is their own number because it IS their own number.

import type { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { q, one } from '../db/index.js';

type Broadcast = (event: string, data: unknown) => void;

interface LinkConfig {
  token: string;
  webhookBase: string; // https://trigger.macrodroid.com/<device-id>
  autoSmsMissed: boolean;
  businessName: string;
}

interface LinkState {
  lastEventAt: number | null;
  activeCallId: number | null;
}
const state: LinkState = { lastEventAt: null, activeCallId: null };

function guard(req: FastifyRequest): void {
  if (process.env.SIMULATE === '1') return;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    const user = jwt.verify(header.slice(7), config.jwtSecret) as { role: string };
    if (user.role !== 'admin') throw new Error();
  } catch {
    throw Object.assign(new Error('Admin only'), { statusCode: 403 });
  }
}

async function loadLink(): Promise<LinkConfig> {
  const row = await one<{ value: LinkConfig }>(`SELECT value FROM settings WHERE key = 'link'`);
  if (row) return row.value;
  const fresh: LinkConfig = {
    token: randomBytes(12).toString('base64url'),
    webhookBase: '',
    autoSmsMissed: true,
    businessName: 'our team',
  };
  await q(`INSERT INTO settings (key, value) VALUES ('link', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [
    JSON.stringify(fresh),
  ]);
  return fresh;
}

async function saveLink(cfg: LinkConfig): Promise<void> {
  await q(`INSERT INTO settings (key, value) VALUES ('link', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [
    JSON.stringify(cfg),
  ]);
}

/** Fire a MacroDroid webhook (GET with query params). */
async function fireWebhook(base: string, trigger: string, params: Record<string, string>): Promise<boolean> {
  try {
    const url = `${base.replace(/\/$/, '')}/${trigger}?${new URLSearchParams(params)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function linkRoutes(app: FastifyInstance, broadcast: Broadcast): void {
  // ---- dashboard setup ----
  app.get('/link/setup', async (req) => {
    guard(req);
    const cfg = await loadLink();
    return {
      token: cfg.token,
      webhookBase: cfg.webhookBase,
      autoSmsMissed: cfg.autoSmsMissed,
      businessName: cfg.businessName,
      connected: state.lastEventAt !== null && Date.now() - state.lastEventAt < 26 * 60 * 60 * 1000,
      lastEventAt: state.lastEventAt,
    };
  });

  app.post('/link/setup', async (req) => {
    guard(req);
    const body = req.body as Partial<LinkConfig>;
    const cfg = await loadLink();
    const merged: LinkConfig = {
      ...cfg,
      ...(body.webhookBase !== undefined ? { webhookBase: body.webhookBase.trim() } : {}),
      ...(body.autoSmsMissed !== undefined ? { autoSmsMissed: body.autoSmsMissed } : {}),
      ...(body.businessName ? { businessName: body.businessName } : {}),
    };
    await saveLink(merged);
    return { ok: true };
  });

  /** Make the phone dial a number (click-to-call through YOUR SIM). */
  app.post('/link/dial', async (req) => {
    guard(req);
    const { to } = req.body as { to: string };
    if (!/^\+?\d{9,15}$/.test((to ?? '').replace(/\s/g, ''))) {
      throw Object.assign(new Error('Invalid number'), { statusCode: 400 });
    }
    const cfg = await loadLink();
    if (!cfg.webhookBase) throw Object.assign(new Error('Link not set up — add your MacroDroid webhook URL first.'), { statusCode: 400 });
    const ok = await fireWebhook(cfg.webhookBase, 'simupbx-dial', { number: to });
    if (ok) {
      const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [to]);
      await q(
        `INSERT INTO calls (direction, from_e164, to_e164, via_number, contact_id, status, tags)
         VALUES ('outbound','linked-sim',$1,'linked-sim',$2,'answered','{link}')`,
        [to, contact?.id ?? null],
      );
    }
    return { ok, hint: ok ? 'Your phone is dialing now.' : 'Webhook failed — check the MacroDroid URL.' };
  });

  /** Send an SMS from the phone's SIM. */
  app.post('/link/sms', async (req) => {
    guard(req);
    const { to, body } = req.body as { to: string; body: string };
    const cfg = await loadLink();
    if (!cfg.webhookBase) throw Object.assign(new Error('Link not set up.'), { statusCode: 400 });
    const ok = await fireWebhook(cfg.webhookBase, 'simupbx-sms', { to, msg: body });
    if (ok) {
      const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [to]);
      await q(
        `INSERT INTO messages (contact_id, channel, direction, e164, body) VALUES ($1,'sms','out',$2,$3)`,
        [contact?.id ?? null, to, body],
      );
    }
    return { ok };
  });

  // ---- events FROM the phone (MacroDroid HTTP requests) ----
  app.post('/link/event', async (req, reply) => {
    const { token } = req.query as { token?: string };
    const cfg = await loadLink();
    if (!token || token !== cfg.token) {
      reply.code(401);
      return { ok: false, error: 'bad token' };
    }
    state.lastEventAt = Date.now();

    const b = req.body as { type?: string; number?: string; duration?: string; body?: string };
    const number = (b.number ?? '').replace(/\s/g, '').replace(/^0/, '+254');
    const contact = await one<{ id: number; name: string }>('SELECT id, name FROM contacts WHERE phone = $1', [number]);

    switch (b.type) {
      case 'ringing': {
        const [row] = await q<{ id: string }>(
          `INSERT INTO calls (direction, from_e164, to_e164, via_number, contact_id, status, tags)
           VALUES ('inbound',$1,'linked-sim','linked-sim',$2,'ringing','{link}') RETURNING id`,
          [number, contact?.id ?? null],
        );
        state.activeCallId = Number(row.id);
        broadcast('call.incoming', {
          callId: state.activeCallId,
          name: contact?.name ?? number,
          number,
          linked: true,
          screening: `Ringing on your linked number — answer on your phone. ${contact ? 'Known contact.' : 'Not in contacts yet.'}`,
        });
        break;
      }
      case 'answered': {
        if (state.activeCallId) {
          await q(`UPDATE calls SET status='answered', answered_at=now() WHERE id=$1`, [state.activeCallId]);
          broadcast('call.answered', { callId: state.activeCallId });
        }
        break;
      }
      case 'ended': {
        if (state.activeCallId) {
          await q(`UPDATE calls SET ended_at=now(), duration_sec=$2 WHERE id=$1`, [
            state.activeCallId,
            Number(b.duration ?? 0),
          ]);
          broadcast('call.ended', { callId: state.activeCallId, summary: null });
          state.activeCallId = null;
        }
        break;
      }
      case 'missed': {
        if (state.activeCallId) {
          await q(`UPDATE calls SET status='missed', ended_at=now(), tags=array_append(tags,'auto-followup-sent') WHERE id=$1`, [
            state.activeCallId,
          ]);
          broadcast('call.missed', { callId: state.activeCallId });
          state.activeCallId = null;
        }
        if (cfg.autoSmsMissed && cfg.webhookBase && number) {
          const text = `Sorry we missed your call! This is ${cfg.businessName} — reply here or call us back and we'll sort you out right away.`;
          const sent = await fireWebhook(cfg.webhookBase, 'simupbx-sms', { to: number, msg: text });
          if (sent) {
            const [msg] = await q(
              `INSERT INTO messages (contact_id, channel, direction, e164, body)
               VALUES ($1,'sms','auto',$2,$3) RETURNING *`,
              [contact?.id ?? null, number, text],
            );
            broadcast('inbox.message', { ...msg, contact_name: contact?.name ?? number });
          }
        }
        break;
      }
      case 'sms_in': {
        const [msg] = await q(
          `INSERT INTO messages (contact_id, channel, direction, e164, body)
           VALUES ($1,'sms','in',$2,$3) RETURNING *`,
          [contact?.id ?? null, number, b.body ?? ''],
        );
        broadcast('inbox.message', { ...msg, contact_name: contact?.name ?? number });
        break;
      }
    }
    return { ok: true };
  });
}
