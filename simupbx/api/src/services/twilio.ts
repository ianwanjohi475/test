// Twilio voice via raw REST (basic auth) — used by the Go Live page to place
// REAL calls to real phones straight from the desktop. Inline TwiML means no
// public webhook is required for outbound tests.

export interface TwilioCreds {
  accountSid: string;
  authToken: string;
  from: string; // your Twilio number, E.164
}

export interface TwilioCallResult {
  sid: string;
  status: string;
}

export async function twilioCall(
  creds: TwilioCreds,
  to: string,
  twiml: string,
  callerId?: string,
): Promise<TwilioCallResult> {
  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');
  const body = new URLSearchParams({
    To: to,
    From: callerId || creds.from,
    Twiml: twiml,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );
  const text = await res.text();
  let data: { sid?: string; status?: string; message?: string; code?: number } = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    /* non-JSON error body (proxy, outage) — fall through to the throw below */
  }
  if (!res.ok) {
    throw Object.assign(
      new Error(`Twilio rejected the call (${res.status}): ${data.message ?? text.slice(0, 120)}`),
      { statusCode: 502 },
    );
  }
  return { sid: data.sid ?? '', status: data.status ?? 'queued' };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const twiml = {
  /** "Your system is alive" announcement call. */
  announce: (business: string) =>
    `<Response><Say voice="Polly.Joanna">Habari! This is ${esc(business)} calling from your Simu P B X phone system. ` +
    `If you can hear this, your system can reach real phones. Karibu — your business line is alive. Kwaheri!</Say></Response>`,

  /** Ring `second` and bridge the two legs; callerId shows on the second phone. */
  bridge: (second: string, callerId: string) =>
    `<Response><Say voice="Polly.Joanna">Connecting your call through Simu P B X.</Say>` +
    `<Dial callerId="${esc(callerId)}" timeout="25">${esc(second)}</Dial></Response>`,
};
