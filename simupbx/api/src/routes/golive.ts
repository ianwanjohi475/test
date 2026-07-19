// Go Live: save carrier credentials from the dashboard and place REAL calls.
// Works with a free Twilio trial (real calls to your verified number, today)
// or Africa's Talking once you have a Kenyan voice number.
// Endpoints are open in desktop mode (SIMULATE=1); JWT-protected otherwise.

import type { FastifyInstance, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config, hasAT } from '../config.js';
import { q, one } from '../db/index.js';
import { twilioCall, twiml, type TwilioCreds } from '../services/twilio.js';
import { placeCall } from '../services/africastalking.js';

interface GoLiveConfig {
  provider: 'twilio' | 'africastalking';
  business: string;
  twilioSid?: string;
  twilioToken?: string;
  twilioFrom?: string;
  callerId?: string;
}

function guard(req: FastifyRequest): void {
  if (process.env.SIMULATE === '1') return; // local desktop mode
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    const user = jwt.verify(header.slice(7), config.jwtSecret) as { role: string };
    if (user.role !== 'admin') throw new Error();
  } catch {
    throw Object.assign(new Error('Admin only'), { statusCode: 403 });
  }
}

async function loadConfig(): Promise<GoLiveConfig | null> {
  const row = await one<{ value: GoLiveConfig }>(`SELECT value FROM settings WHERE key = 'golive'`);
  return row?.value ?? null;
}

function twilioCreds(cfg: GoLiveConfig | null): TwilioCreds | null {
  const sid = cfg?.twilioSid || process.env.TWILIO_ACCOUNT_SID;
  const token = cfg?.twilioToken || process.env.TWILIO_AUTH_TOKEN;
  const from = cfg?.twilioFrom || process.env.TWILIO_FROM;
  if (!sid || !token || !from) return null;
  return { accountSid: sid, authToken: token, from };
}

async function logOutbound(to: string, via: string, tag: string): Promise<void> {
  const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [to]);
  await q(
    `INSERT INTO calls (direction, from_e164, to_e164, via_number, contact_id, status, tags)
     VALUES ('outbound',$1,$2,$1,$3,'answered',$4)`,
    [via, to, contact?.id ?? null, [tag]],
  );
}

export function goliveRoutes(app: FastifyInstance): void {
  app.get('/golive/config', async (req) => {
    guard(req);
    const cfg = await loadConfig();
    const creds = twilioCreds(cfg);
    return {
      provider: cfg?.provider ?? 'twilio',
      business: cfg?.business ?? 'SimuPBX',
      callerId: cfg?.callerId ?? '',
      twilioFrom: creds?.from ?? '',
      twilioConfigured: Boolean(creds),
      atConfigured: hasAT(),
    };
  });

  app.post('/golive/config', async (req) => {
    guard(req);
    const body = req.body as Partial<GoLiveConfig>;
    const existing = (await loadConfig()) ?? ({ provider: 'twilio', business: 'SimuPBX' } as GoLiveConfig);
    const merged: GoLiveConfig = {
      ...existing,
      ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== '')),
    };
    await q(
      `INSERT INTO settings (key, value) VALUES ('golive', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(merged)],
    );
    return { ok: true, twilioConfigured: Boolean(twilioCreds(merged)) };
  });

  /** Ring one real phone with the "system alive" announcement. */
  app.post('/golive/test-call', async (req) => {
    guard(req);
    const { to } = req.body as { to: string };
    if (!/^\+\d{9,15}$/.test(to ?? '')) {
      throw Object.assign(new Error('Number must be E.164, e.g. +2547XXXXXXXX'), { statusCode: 400 });
    }
    const cfg = await loadConfig();

    if ((cfg?.provider ?? 'twilio') === 'africastalking' && hasAT()) {
      await placeCall(to);
      await logOutbound(to, config.at.voiceNumber, 'golive-test');
      return { ok: true, via: `Africa's Talking ${config.at.voiceNumber}` };
    }

    const creds = twilioCreds(cfg);
    if (!creds) {
      throw Object.assign(
        new Error('No carrier configured. Paste your Twilio SID, token and number first.'),
        { statusCode: 400 },
      );
    }
    const result = await twilioCall(creds, to, twiml.announce(cfg?.business ?? 'your business'));
    await logOutbound(to, creds.from, 'golive-test');
    return { ok: true, via: `Twilio ${creds.from}`, sid: result.sid, status: result.status };
  });

  /** Bridge two real phones: rings `first`, then dials `second` and connects
      them — the second phone sees `callerId`. */
  app.post('/golive/bridge', async (req) => {
    guard(req);
    const { first, second } = req.body as { first: string; second: string };
    for (const n of [first, second]) {
      if (!/^\+\d{9,15}$/.test(n ?? '')) {
        throw Object.assign(new Error('Both numbers must be E.164, e.g. +2547XXXXXXXX'), { statusCode: 400 });
      }
    }
    const cfg = await loadConfig();
    const creds = twilioCreds(cfg);
    if (!creds) {
      throw Object.assign(new Error('Bridging needs Twilio configured (free trial works).'), { statusCode: 400 });
    }
    // Caller ID on the second leg: your verified number if set, else the Twilio number.
    const callerId = cfg?.callerId || creds.from;
    const result = await twilioCall(creds, first, twiml.bridge(second, callerId));
    await logOutbound(second, callerId, 'golive-bridge');
    return { ok: true, sid: result.sid, callerId };
  });
}
