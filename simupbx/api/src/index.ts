import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { q } from './db/index.js';
import { esl } from './services/esl.js';
import { summarizeCall } from './services/ai.js';
import { apiRoutes } from './routes/api.js';
import { webhookRoutes } from './routes/webhooks.js';
import { freeswitchRoutes } from './routes/freeswitch.js';
import { goliveRoutes } from './routes/golive.js';
import { linkRoutes } from './routes/link.js';

const app = Fastify({ logger: true });

// Realtime: presence + live call events pushed to every connected dashboard.
const sockets = new Set<WebSocket>();
export function broadcast(event: string, data: unknown): void {
  const payload = JSON.stringify({ event, data });
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

async function main(): Promise<void> {
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Africa's Talking posts form-encoded bodies.
  await app.register(formbody);

  app.get('/health', async () => ({ ok: true, esl: esl.connected }));

  app.get('/realtime', { websocket: true }, (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  apiRoutes(app);
  webhookRoutes(app);
  freeswitchRoutes(app);
  goliveRoutes(app);
  linkRoutes(app, broadcast);

  await migrate();

  // Desktop / demo mode: live simulation engine drives calls, transcripts,
  // inbox and presence in real time without a telco account.
  if (process.env.SIMULATE === '1') {
    const { seedDemoData, startSimulator } = await import('./services/simulator.js');
    const { simRoutes } = await import('./routes/sim.js');
    simRoutes(app);
    await seedDemoData();
    startSimulator(broadcast);
    app.log.info('SIMULATE=1 — live simulation engine running');
  }

  // FreeSWITCH event bridge → presence + CDR for on-prem SIP legs.
  esl.on('connected', () => app.log.info('FreeSWITCH ESL connected'));
  esl.on('error', () => undefined); // reconnect loop handles it
  esl.on('event', async (ev: Record<string, string>) => {
    const name = ev['Event-Name'];
    if (name === 'CUSTOM' && ev['Event-Subclass']?.startsWith('sofia::')) {
      const online = ev['Event-Subclass'] === 'sofia::register';
      const ext = ev['from-user'] ?? ev['username'];
      if (ext) {
        await q('UPDATE users SET presence = $2 WHERE extension = $1', [ext, online ? 'available' : 'offline']);
        broadcast('presence', { extension: ext, online });
      }
    } else if (name === 'CHANNEL_ANSWER') {
      broadcast('call', { state: 'answered', uuid: ev['Unique-ID'], from: ev['Caller-Caller-ID-Number'] });
    } else if (name === 'CHANNEL_HANGUP_COMPLETE') {
      broadcast('call', { state: 'ended', uuid: ev['Unique-ID'] });
      // If this leg carried a transcript (agent-assist STT), summarize it now.
      const providerId = ev['Unique-ID'];
      const [call] = await q<{ id: number; transcript: { speaker: string; text: string }[] | null }>(
        'SELECT id, transcript FROM calls WHERE provider_id = $1', [providerId],
      );
      if (call?.transcript?.length) {
        const summary = await summarizeCall(call.transcript);
        if (summary) await q('UPDATE calls SET summary = $2 WHERE id = $1', [call.id, JSON.stringify(summary)]);
      }
    }
  });
  if (process.env.SIMULATE !== '1') esl.connect(); // no FreeSWITCH in desktop mode

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
