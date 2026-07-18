// Provider webhooks: Africa's Talking voice (the live IVR + Zuri flow),
// AT SMS delivery/inbound, and the Daraja M-Pesa confirmation.
// AT sends application/x-www-form-urlencoded POSTs and expects Voice XML back.

import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { q, one } from '../db/index.js';
import { xml, sendSms } from '../services/africastalking.js';
import { zuriReply } from '../services/ai.js';
import { analyzeVoicemail, summarizeCall } from '../services/ai.js';
import { stkPush } from '../services/mpesa.js';

// Per-call conversation state for Zuri (sessionId -> chat history).
const zuriSessions = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();

const QUEUE_EXTENSIONS: Record<string, string[]> = {
  sales: ['101', '105'],
  support: ['102', '103'],
  accounts: ['104'],
};

async function upsertCall(sessionId: string, from: string, to: string): Promise<number> {
  const existing = await one<{ id: number }>('SELECT id FROM calls WHERE provider_id = $1', [sessionId]);
  if (existing) return existing.id;
  const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [from]);
  const [row] = await q<{ id: number }>(
    `INSERT INTO calls (provider_id, direction, from_e164, to_e164, via_number, contact_id, status)
     VALUES ($1,'inbound',$2,$3,$3,$4,'ringing') RETURNING id`,
    [sessionId, from, to, contact?.id ?? null],
  );
  return row.id;
}

function routeToXml(route: string, cbBase: string): string {
  if (route === 'mpesa') {
    return (
      xml.say('Sawa. Enter the amount in shillings, then press hash.') +
      xml.getDigits('', `${cbBase}/mpesa-amount`, 7, 12)
    );
  }
  if (route === 'voicemail') {
    return (
      xml.say('Please leave your message after the beep. Press hash when done.') +
      xml.record(`${cbBase}/voicemail`)
    );
  }
  const exts = QUEUE_EXTENSIONS[route] ?? QUEUE_EXTENSIONS.sales;
  return xml.say('Connecting you now.') + xml.dialSip(exts[0]);
}

export function webhookRoutes(app: FastifyInstance): void {
  const cbBase = `${config.publicUrl}/webhooks/at/voice`;

  // Main voice entrypoint — Africa's Talking hits this on every call event.
  app.post('/webhooks/at/voice', async (req, reply) => {
    const b = req.body as Record<string, string>;
    const { sessionId, callerNumber, destinationNumber, isActive } = b;

    reply.type('application/xml');

    // Call ended → finalize CDR, fire missed-call follow-up, clean up.
    if (isActive === '0') {
      const durationSec = Number(b.durationInSeconds ?? 0);
      const answered = durationSec > 0 && b.dialCallStatus === 'Completed';
      await q(
        `UPDATE calls SET status = CASE WHEN status = 'ringing' THEN $2 ELSE status END,
           ended_at = now(), duration_sec = $3, recording_url = coalesce($4, recording_url),
           cost_kes = $5
         WHERE provider_id = $1`,
        [sessionId, answered ? 'answered' : 'missed', durationSec, b.recordingUrl ?? null,
         b.amount ? Number(b.amount) : null],
      );
      if (!answered && callerNumber) {
        // Missed-call WhatsApp/SMS follow-up so no lead goes cold.
        sendSms(
          callerNumber,
          'Sorry we missed your call! Reply here and we will get right back to you, or call us again anytime.',
        ).catch(() => undefined);
        await q(`UPDATE calls SET tags = array_append(tags, 'auto-followup-sent') WHERE provider_id = $1`, [sessionId]);
      }
      zuriSessions.delete(sessionId);
      return xml.wrap('');
    }

    await upsertCall(sessionId, callerNumber, destinationNumber);

    // Zuri answers: greet + open a speech-gathering loop.
    // (AT supports DTMF natively; speech legs run through the recording callback.)
    const zuri = await one<{ value: { enabled: boolean } }>(`SELECT value FROM settings WHERE key = 'zuri'`);
    if (zuri?.value.enabled) {
      zuriSessions.set(sessionId, []);
      return xml.wrap(
        xml.say('Karibu! Thank you for calling. I am Zuri.') +
          xml.getDigits(
            xml.say('Press 1 for Sales. 2 for Support. 3 to pay with M-Pesa. 4 for Accounts. Or 9 to leave a message.'),
            `${cbBase}/menu`, 1, 10,
          ),
      );
    }

    // Zuri off → straight to the main menu.
    return xml.wrap(
      xml.getDigits(
        xml.say('Press 1 for Sales, 2 for Support, 3 to pay with M-Pesa, 9 to leave a message.'),
        `${cbBase}/menu`, 1, 10,
      ),
    );
  });

  // DTMF menu selection
  app.post('/webhooks/at/voice/menu', async (req, reply) => {
    const b = req.body as Record<string, string>;
    reply.type('application/xml');
    const digit = b.dtmfDigits;
    const route =
      digit === '1' ? 'sales' :
      digit === '2' ? 'support' :
      digit === '3' ? 'mpesa' :
      digit === '4' ? 'accounts' :
      digit === '9' ? 'voicemail' : null;
    if (!route) {
      return xml.wrap(
        xml.getDigits(xml.say('Sorry, I did not get that. Please try again.'), `${cbBase}/menu`, 1, 10),
      );
    }
    if (route !== 'mpesa' && route !== 'voicemail') {
      await q(`UPDATE calls SET queue = $2 WHERE provider_id = $1`, [b.sessionId, route]);
    }
    return xml.wrap(routeToXml(route, cbBase));
  });

  // M-Pesa on the IVR: caller keyed in an amount → STK push to their phone.
  app.post('/webhooks/at/voice/mpesa-amount', async (req, reply) => {
    const b = req.body as Record<string, string>;
    reply.type('application/xml');
    const amount = Number(b.dtmfDigits);
    if (!amount || amount <= 0) {
      return xml.wrap(xml.say('That amount was not valid. Goodbye.') );
    }
    try {
      const call = await one<{ id: number; contact_id: number | null }>(
        'SELECT id, contact_id FROM calls WHERE provider_id = $1', [b.sessionId],
      );
      const stk = await stkPush(b.callerNumber, amount, `CALL${call?.id ?? ''}`);
      await q(
        `INSERT INTO payments (call_id, contact_id, phone, amount_kes, checkout_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [call?.id ?? null, call?.contact_id ?? null, b.callerNumber, amount, stk.checkoutRequestId],
      );
      return xml.wrap(
        xml.say(
          `Asante. Check your phone for the M-Pesa prompt of ${amount} shillings and enter your PIN. Stay on the line.`,
        ) + xml.say('Thank you for your payment. Goodbye!'),
      );
    } catch {
      return xml.wrap(xml.say('Sorry, we could not start the payment. Please try again later.'));
    }
  });

  // Voicemail recording finished → transcribe (provider/Whisper hook) + urgency.
  app.post('/webhooks/at/voice/voicemail', async (req, reply) => {
    const b = req.body as Record<string, string>;
    reply.type('application/xml');
    const call = await one<{ id: number }>('SELECT id FROM calls WHERE provider_id = $1', [b.sessionId]);
    const transcript = b.transcription ?? ''; // plug faster-whisper here for self-hosted STT
    const analysis = transcript ? await analyzeVoicemail(transcript) : { urgency: 'normal' as const, reason: '' };
    await q(
      `INSERT INTO voicemails (call_id, from_e164, audio_url, transcript, urgency, urgency_reason)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [call?.id ?? null, b.callerNumber, b.recordingUrl ?? null, transcript || null, analysis.urgency, analysis.reason || null],
    );
    await q(`UPDATE calls SET status = 'voicemail' WHERE provider_id = $1`, [b.sessionId]);
    return xml.wrap(xml.say('Thank you. We will get back to you shortly. Kwaheri!'));
  });

  // Zuri conversational leg (speech-to-text text arrives from the STT hook).
  app.post('/webhooks/at/voice/zuri-turn', async (req, reply) => {
    const b = req.body as Record<string, string>;
    reply.type('application/xml');
    const history = zuriSessions.get(b.sessionId) ?? [];
    history.push({ role: 'user', content: b.speechText ?? b.transcription ?? '' });
    const result = await zuriReply(history);
    history.push({ role: 'assistant', content: result.say });
    zuriSessions.set(b.sessionId, history);
    if (result.route) {
      await q(`UPDATE calls SET status = 'zuri', queue = $2 WHERE provider_id = $1`, [b.sessionId, result.route]);
      return xml.wrap(xml.say(result.say) + routeToXml(result.route, cbBase));
    }
    return xml.wrap(xml.say(result.say) + xml.record(`${cbBase}/zuri-turn`, 15));
  });

  // Inbound SMS → unified inbox.
  app.post('/webhooks/at/sms', async (req) => {
    const b = req.body as Record<string, string>;
    const contact = await one<{ id: number }>('SELECT id FROM contacts WHERE phone = $1', [b.from]);
    await q(
      `INSERT INTO messages (contact_id, channel, direction, e164, body, provider_id)
       VALUES ($1,'sms','in',$2,$3,$4)`,
      [contact?.id ?? null, b.from, b.text ?? '', b.id ?? null],
    );
    return { ok: true };
  });

  // Daraja STK confirmation.
  app.post('/webhooks/mpesa', async (req) => {
    const body = req.body as {
      Body?: { stkCallback?: { CheckoutRequestID: string; ResultCode: number; CallbackMetadata?: { Item: { Name: string; Value: unknown }[] } } };
    };
    const cb = body.Body?.stkCallback;
    if (!cb) return { ok: true };
    const paid = cb.ResultCode === 0;
    const receipt = cb.CallbackMetadata?.Item.find((i) => i.Name === 'MpesaReceiptNumber')?.Value as string | undefined;
    const [payment] = await q<{ phone: string; amount_kes: string }>(
      `UPDATE payments SET status = $2, mpesa_ref = $3 WHERE checkout_id = $1 RETURNING phone, amount_kes`,
      [cb.CheckoutRequestID, paid ? 'paid' : 'failed', receipt ?? null],
    );
    if (paid && payment) {
      sendSms(
        payment.phone,
        `Payment of KES ${payment.amount_kes} received via M-Pesa (${receipt}). Asante for your business!`,
      ).catch(() => undefined);
    }
    return { ok: true };
  });
}
