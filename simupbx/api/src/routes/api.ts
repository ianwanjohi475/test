// Authenticated REST API consumed by the web app.

import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { q, one } from '../db/index.js';
import { esl } from '../services/esl.js';
import { sendSms } from '../services/africastalking.js';
import { zuriReply } from '../services/ai.js';

interface AuthUser {
  id: number;
  role: 'admin' | 'manager' | 'agent';
  extension: string;
}

function auth(req: FastifyRequest): AuthUser {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    return jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
  } catch {
    throw Object.assign(new Error('Invalid token'), { statusCode: 401 });
  }
}

function requireRole(user: AuthUser, ...roles: AuthUser['role'][]): void {
  if (!roles.includes(user.role)) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
}

export function apiRoutes(app: FastifyInstance): void {
  // ---- auth ----
  app.post('/auth/login', async (req) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await one<{ id: number; password_hash: string; role: AuthUser['role']; extension: string; name: string; sip_password: string }>(
      'SELECT id, password_hash, role, extension, name, sip_password FROM users WHERE email = $1',
      [email],
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, extension: user.extension } satisfies AuthUser,
      config.jwtSecret,
      { expiresIn: '12h' },
    );
    return {
      token,
      user: { id: user.id, name: user.name, role: user.role, extension: user.extension },
      sip: { domain: config.sipDomain, extension: user.extension, password: user.sip_password },
    };
  });

  // ---- users / extensions ----
  app.get('/users', async (req) => {
    auth(req);
    return q('SELECT id, name, email, role, extension, presence, queues FROM users ORDER BY extension');
  });

  app.post('/users', async (req) => {
    requireRole(auth(req), 'admin');
    const { name, email, password, role = 'agent', extension, queues = [] } = req.body as {
      name: string; email: string; password: string; role?: string; extension: string; queues?: string[];
    };
    const sipPassword = randomBytes(18).toString('base64url');
    const [user] = await q(
      `INSERT INTO users (name, email, password_hash, role, extension, sip_password, queues)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, email, role, extension`,
      [name, email, await bcrypt.hash(password, 10), role, extension, sipPassword, queues],
    );
    return user;
  });

  // ---- calls (CDR) ----
  app.get('/calls', async (req) => {
    auth(req);
    const { search, direction, limit = 50 } = req.query as { search?: string; direction?: string; limit?: number };
    const where: string[] = [];
    const params: unknown[] = [];
    if (direction) {
      params.push(direction);
      where.push(`direction = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(from_e164 ILIKE $${params.length} OR to_e164 ILIKE $${params.length} OR transcript::text ILIKE $${params.length} OR summary::text ILIKE $${params.length})`,
      );
    }
    params.push(Math.min(Number(limit), 200));
    return q(
      `SELECT c.*, ct.name AS contact_name, u.name AS agent_name
       FROM calls c
       LEFT JOIN contacts ct ON ct.id = c.contact_id
       LEFT JOIN users u ON u.id = c.agent_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.started_at DESC LIMIT $${params.length}`,
      params,
    );
  });

  // Click-to-call: ring my extension, then bridge the target.
  app.post('/calls/dial', async (req) => {
    const user = auth(req);
    const { to } = req.body as { to: string };
    if (to.startsWith('+') && !to.startsWith('+254') && !config.security.allowInternational) {
      const allowed = config.security.intlAllowlist.some((p) => to.startsWith(p));
      if (!allowed) throw Object.assign(new Error('International dialing is disabled'), { statusCode: 403 });
    }
    const number = await one<{ e164: string }>('SELECT e164 FROM numbers ORDER BY id LIMIT 1');
    await esl.originate(user.extension, to, number?.e164 ?? '');
    return { ok: true };
  });

  // ---- contacts ----
  app.get('/contacts', async (req) => {
    auth(req);
    return q('SELECT * FROM contacts ORDER BY name');
  });
  app.post('/contacts', async (req) => {
    auth(req);
    const { name, company, phone, email, tags = [] } = req.body as {
      name: string; company?: string; phone: string; email?: string; tags?: string[];
    };
    const [row] = await q(
      'INSERT INTO contacts (name, company, phone, email, tags) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, company ?? null, phone, email ?? null, tags],
    );
    return row;
  });

  // ---- voicemails ----
  app.get('/voicemails', async (req) => {
    auth(req);
    return q('SELECT * FROM voicemails ORDER BY created_at DESC LIMIT 100');
  });

  // ---- unified inbox ----
  app.get('/messages', async (req) => {
    auth(req);
    return q(
      `SELECT m.*, c.name AS contact_name FROM messages m
       LEFT JOIN contacts c ON c.id = m.contact_id
       ORDER BY m.created_at DESC LIMIT 300`,
    );
  });
  app.post('/messages/send', async (req) => {
    auth(req);
    const { to, body } = req.body as { to: string; body: string };
    const providerId = await sendSms(to, body);
    const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [to]);
    const [row] = await q(
      `INSERT INTO messages (contact_id, channel, direction, e164, body, provider_id)
       VALUES ($1,'sms','out',$2,$3,$4) RETURNING *`,
      [contact?.id ?? null, to, body, providerId],
    );
    return row;
  });

  // ---- Zuri knowledge base + test console ----
  app.get('/zuri/kb', async (req) => {
    auth(req);
    return q('SELECT * FROM kb_entries ORDER BY id');
  });
  app.post('/zuri/kb', async (req) => {
    requireRole(auth(req), 'admin', 'manager');
    const { question, answer } = req.body as { question: string; answer: string };
    const [row] = await q('INSERT INTO kb_entries (question, answer) VALUES ($1,$2) RETURNING *', [question, answer]);
    return row;
  });
  app.delete('/zuri/kb/:id', async (req) => {
    requireRole(auth(req), 'admin', 'manager');
    await q('DELETE FROM kb_entries WHERE id = $1', [(req.params as { id: string }).id]);
    return { ok: true };
  });
  app.post('/zuri/test', async (req) => {
    auth(req);
    const { history } = req.body as { history: { role: 'user' | 'assistant'; content: string }[] };
    return zuriReply(history);
  });

  // ---- wallboard stats ----
  app.get('/stats/today', async (req) => {
    auth(req);
    const [row] = await q<Record<string, string>>(
      `SELECT
         count(*) FILTER (WHERE started_at::date = now()::date) AS total,
         count(*) FILTER (WHERE started_at::date = now()::date AND status = 'answered') AS answered,
         count(*) FILTER (WHERE started_at::date = now()::date AND status = 'missed') AS missed,
         count(*) FILTER (WHERE started_at::date = now()::date AND status = 'zuri') AS zuri,
         coalesce(avg(EXTRACT(EPOCH FROM answered_at - started_at)) FILTER (WHERE started_at::date = now()::date), 0)::int AS avg_wait_sec
       FROM calls`,
    );
    const [pay] = await q<{ collected: string }>(
      `SELECT coalesce(sum(amount_kes), 0) AS collected FROM payments
       WHERE status = 'paid' AND created_at::date = now()::date`,
    );
    return { ...row, mpesa_collected: pay.collected };
  });
}
