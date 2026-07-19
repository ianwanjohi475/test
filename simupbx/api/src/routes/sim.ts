// Local-mode routes (enabled with SIMULATE=1): unauthenticated, meant only
// for the desktop app talking to its own local API. The Zuri endpoint calls
// the real Claude API when ANTHROPIC_API_KEY is set.

import type { FastifyInstance } from 'fastify';
import { simulatorControl } from '../services/simulator.js';
import { zuriReply } from '../services/ai.js';
import { q } from '../db/index.js';

export function simRoutes(app: FastifyInstance): void {
  app.post('/sim/calls/:id/answer', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const ok = await simulatorControl.answer(id);
    return { ok };
  });

  app.post('/sim/calls/:id/hangup', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await simulatorControl.hangup(id);
    return { ok: true };
  });

  app.post('/sim/zuri', async (req) => {
    const { history } = req.body as { history: { role: 'user' | 'assistant'; content: string }[] };
    return zuriReply(history);
  });

  app.get('/sim/calls', async () => {
    return q(
      `SELECT c.*, ct.name AS contact_name FROM calls c
       LEFT JOIN contacts ct ON ct.id = c.contact_id
       ORDER BY c.started_at DESC LIMIT 50`,
    );
  });

  app.get('/sim/messages', async () => {
    return q(
      `SELECT m.*, c.name AS contact_name FROM messages m
       LEFT JOIN contacts c ON c.id = m.contact_id
       ORDER BY m.created_at DESC LIMIT 100`,
    );
  });
}
