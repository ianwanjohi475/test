// Africa's Talking Voice + SMS via their REST API (no SDK dependency).
// Voice flow: AT POSTs call events to /webhooks/at/voice; we answer with
// Voice XML actions (Say, GetDigits, Dial, Record, Enqueue...).

import { config, hasAT } from '../config.js';

const AT_API = 'https://api.africastalking.com/version1';
const AT_VOICE = 'https://voice.africastalking.com';

function atHeaders(): Record<string, string> {
  return {
    apiKey: config.at.apiKey,
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

export async function sendSms(to: string, message: string): Promise<string | null> {
  if (!hasAT()) return null;
  const body = new URLSearchParams({ username: config.at.username, to, message });
  if (config.at.smsSenderId) body.set('from', config.at.smsSenderId);
  const res = await fetch(`${AT_API}/messaging`, { method: 'POST', headers: atHeaders(), body });
  if (!res.ok) throw new Error(`AT SMS failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { SMSMessageData?: { Recipients?: { messageId?: string }[] } };
  return data.SMSMessageData?.Recipients?.[0]?.messageId ?? null;
}

/** Outbound call via AT (used for callback queue + click-to-call fallback). */
export async function placeCall(to: string): Promise<void> {
  if (!hasAT()) throw new Error("Africa's Talking not configured");
  const body = new URLSearchParams({
    username: config.at.username,
    from: config.at.voiceNumber,
    to,
  });
  const res = await fetch(`${AT_VOICE}/call`, { method: 'POST', headers: atHeaders(), body });
  if (!res.ok) throw new Error(`AT call failed: ${res.status} ${await res.text()}`);
}

// ---- Voice XML builders (AT calls these "actions") ----

export const xml = {
  wrap: (inner: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
  say: (text: string, voice = 'woman') => `<Say voice="${voice}" playBeep="false">${escapeXml(text)}</Say>`,
  play: (url: string) => `<Play url="${escapeXml(url)}"/>`,
  getDigits: (inner: string, cbUrl: string, numDigits = 1, timeout = 8) =>
    `<GetDigits callbackUrl="${escapeXml(cbUrl)}" numDigits="${numDigits}" timeout="${timeout}">${inner}</GetDigits>`,
  dialSip: (ext: string, record = true) =>
    `<Dial record="${record}" sequential="true" phoneNumbers="${ext}@${config.sipDomain}"/>`,
  dialPhone: (e164: string, record = true) =>
    `<Dial record="${record}" phoneNumbers="${escapeXml(e164)}"/>`,
  record: (cbUrl: string, maxLen = 120) =>
    `<Record finishOnKey="#" maxLength="${maxLen}" trimSilence="true" playBeep="true" callbackUrl="${escapeXml(cbUrl)}"/>`,
  enqueue: (holdMusicUrl?: string) =>
    holdMusicUrl ? `<Enqueue holdMusic="${escapeXml(holdMusicUrl)}"/>` : `<Enqueue/>`,
  dequeue: (phoneNumber: string) => `<Dequeue phoneNumber="${escapeXml(phoneNumber)}"/>`,
  reject: () => `<Reject/>`,
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
