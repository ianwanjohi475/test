// Safaricom Daraja M-Pesa STK push — the on-call payment flow.
// Caller presses "pay" on the IVR → we push the prompt to their phone →
// Daraja confirms to /webhooks/mpesa → receipt SMS + payment logged.

import { config, hasMpesa } from '../config.js';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const auth = Buffer.from(`${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`).toString('base64');
  const res = await fetch(
    `${config.mpesa.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return data.access_token;
}

export interface StkResult {
  checkoutRequestId: string;
  responseDescription: string;
}

export async function stkPush(phone: string, amountKes: number, reference: string): Promise<StkResult> {
  if (!hasMpesa()) throw new Error('M-Pesa (Daraja) not configured');
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer.from(`${config.mpesa.shortCode}${config.mpesa.passkey}${timestamp}`).toString('base64');
  const msisdn = phone.replace(/\D/g, '').replace(/^0/, '254').replace(/^\+/, '');

  const res = await fetch(`${config.mpesa.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: config.mpesa.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amountKes),
      PartyA: msisdn,
      PartyB: config.mpesa.shortCode,
      PhoneNumber: msisdn,
      CallBackURL: `${config.publicUrl}/webhooks/mpesa`,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: 'SimuPBX payment',
    }),
  });
  if (!res.ok) throw new Error(`STK push failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { CheckoutRequestID: string; ResponseDescription: string };
  return { checkoutRequestId: data.CheckoutRequestID, responseDescription: data.ResponseDescription };
}
