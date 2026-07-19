'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  KeyRound,
  Loader2,
  Phone,
  PhoneCall,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Card, SectionTitle } from '@/components/ui';
import { apiGet, apiPost } from '@/lib/api';

type Status = { kind: 'idle' } | { kind: 'busy'; msg: string } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string };

const API = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000';

function LinkMyNumber() {
  const [token, setToken] = useState('');
  const [webhookBase, setWebhookBase] = useState('');
  const [connected, setConnected] = useState(false);
  const [dialTo, setDialTo] = useState('+254');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    apiGet<{ token: string; webhookBase: string; connected: boolean }>('/link/setup').then((cfg) => {
      if (cfg) {
        setToken(cfg.token);
        setWebhookBase(cfg.webhookBase);
        setConnected(cfg.connected);
      }
    });
  }, []);

  const save = async () => {
    const res = await apiPost<{ ok: boolean }>('/link/setup', { webhookBase });
    setStatus(res?.ok ? { kind: 'ok', msg: 'Saved. Now set up the two macros on your phone (guide below).' } : { kind: 'err', msg: 'Engine not reachable.' });
  };

  const testDial = async () => {
    setStatus({ kind: 'busy', msg: 'Telling your phone to dial…' });
    try {
      const res = await fetch(`${API}/link/dial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: dialTo.replace(/\s/g, '') }),
      });
      const data = (await res.json()) as { ok?: boolean; hint?: string; message?: string };
      setStatus(
        res.ok && data.ok
          ? { kind: 'ok', msg: `📱 ${data.hint ?? 'Your phone is dialing!'}` }
          : { kind: 'err', msg: data.hint ?? data.message ?? 'Failed — check the webhook URL.' },
      );
    } catch {
      setStatus({ kind: 'err', msg: 'Engine not reachable — run: bash run-desktop.sh' });
    }
  };

  return (
    <Card className="border-brand-500/25 p-5">
      <SectionTitle
        title="FREE alternative · Link YOUR number (your phone becomes the line)"
        action={
          connected ? (
            <Badge tone="brand"><CheckCircle2 className="h-3 w-3" /> phone linked</Badge>
          ) : (
            <Badge tone="slate">not linked yet</Badge>
          )
        }
      />
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        Zero monthly cost: your Android phone + SIM become the trunk. Calls to <b>your real number</b> pop up
        here live, missed calls auto-SMS the caller from your SIM, and pressing call in this app makes
        <b> your phone dial</b> — the other person sees <b>your number</b>. You talk on the handset; SimuPBX is the brain.
      </p>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="MacroDroid webhook URL  (https://trigger.macrodroid.com/xxxx-xxxx…)"
            value={webhookBase}
            onChange={(e) => setWebhookBase(e.target.value)}
          />
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="+2547XXXXXXXX" value={dialTo} onChange={(e) => setDialTo(e.target.value)} />
          <button className="btn-ghost" onClick={testDial} disabled={status.kind === 'busy'}>
            <Phone className="h-4 w-4 text-brand-400" /> Dial via my phone
          </button>
        </div>
        {status.kind !== 'idle' && (
          <p className={`text-xs ${status.kind === 'ok' ? 'text-brand-300' : status.kind === 'err' ? 'text-rose-300' : 'text-slate-400'}`}>{status.msg}</p>
        )}
      </div>

      <details className="mt-4 rounded-xl bg-white/[0.03] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-brand-300">📱 Phone setup guide (10 minutes, once)</summary>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
          <p>1. Install <b>MacroDroid</b> (free, Play Store) on the Android phone with your SIM. Allow phone + SMS permissions.</p>
          <p>2. In MacroDroid → Settings, note your <b>webhook URL</b> (looks like <code>https://trigger.macrodroid.com/xxxxxxxx-…</code>). Paste it above and Save.</p>
          <p>3. Expose your engine so the phone can reach it — in a new terminal run:{' '}
            <code className="rounded bg-black/40 px-1.5 py-0.5">npx cloudflared tunnel --url http://localhost:4000</code>{' '}
            and copy the printed <code>https://….trycloudflare.com</code> URL. Call it <b>ENGINE</b>.</p>
          <p className="font-semibold text-slate-300">4. Create these macros:</p>
          <ul className="ml-4 list-disc space-y-2">
            <li><b>Incoming call</b> — Trigger: <i>Call Incoming (any)</i> → Action: <i>HTTP Request POST</i> to{' '}
              <code>ENGINE/link/event?token={token || 'YOUR-TOKEN'}</code>, content type JSON, body:{' '}
              <code>{'{"type":"ringing","number":"[call_number]"}'}</code></li>
            <li><b>Call answered</b> — Trigger: <i>Call Active</i> → same POST with body <code>{'{"type":"answered","number":"[call_number]"}'}</code></li>
            <li><b>Call ended</b> — Trigger: <i>Call Ended</i> → body <code>{'{"type":"ended","number":"[call_number]"}'}</code></li>
            <li><b>Call missed</b> — Trigger: <i>Call Missed</i> → body <code>{'{"type":"missed","number":"[call_number]"}'}</code></li>
            <li><b>SMS received</b> — Trigger: <i>SMS Received (any)</i> → body <code>{'{"type":"sms_in","number":"[sms_number]","body":"[sms_message]"}'}</code></li>
            <li><b>Dial command</b> — Trigger: <i>Webhook (URL)</i> identifier <code>simupbx-dial</code> → Action: <i>Make Call</i> to variable <code>{'{number}'}</code></li>
            <li><b>SMS command</b> — Trigger: <i>Webhook (URL)</i> identifier <code>simupbx-sms</code> → Action: <i>Send SMS</i> to <code>{'{to}'}</code> with message <code>{'{msg}'}</code></li>
          </ul>
          <p>5. Test: call your number from another phone — it pops up here live. Ignore it → the caller gets your auto-SMS. Then press “Dial via my phone” above and watch your handset dial.</p>
          <p className="text-slate-500">Your pairing token: <code className="rounded bg-black/40 px-1.5 py-0.5">{token || '…start the engine…'}</code> · Honest limits: call audio stays on the handset (you talk on your phone), one line at a time, and the phone must be on with internet. For multi-line + browser audio, that&apos;s what the carrier path above is for.</p>
        </div>
      </details>
    </Card>
  );
}

export default function GoLivePage() {
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [business, setBusiness] = useState('');
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');
  const [from, setFrom] = useState('');
  const [callerId, setCallerId] = useState('');
  const [myNumber, setMyNumber] = useState('+254');
  const [secondNumber, setSecondNumber] = useState('+254');
  const [saveStatus, setSaveStatus] = useState<Status>({ kind: 'idle' });
  const [callStatus, setCallStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    apiGet<{ business: string; callerId: string; twilioFrom: string; twilioConfigured: boolean }>(
      '/golive/config',
    ).then((cfg) => {
      setApiUp(Boolean(cfg));
      if (cfg) {
        setBusiness(cfg.business);
        setCallerId(cfg.callerId);
        setFrom(cfg.twilioFrom);
        setTwilioConfigured(cfg.twilioConfigured);
      }
    });
  }, []);

  const save = async () => {
    setSaveStatus({ kind: 'busy', msg: 'Saving…' });
    const res = await apiPost<{ ok: boolean; twilioConfigured: boolean }>('/golive/config', {
      provider: 'twilio',
      business,
      twilioSid: sid,
      twilioToken: token,
      twilioFrom: from,
      callerId,
    });
    if (res?.ok) {
      setTwilioConfigured(res.twilioConfigured);
      setSaveStatus({
        kind: res.twilioConfigured ? 'ok' : 'err',
        msg: res.twilioConfigured ? 'Carrier connected — you can call real phones now.' : 'Saved, but SID/token/number incomplete.',
      });
    } else {
      setSaveStatus({ kind: 'err', msg: 'Could not save — is the engine running? (bash run-desktop.sh)' });
    }
  };

  const testCall = async () => {
    setCallStatus({ kind: 'busy', msg: `Calling ${myNumber} — pick up your phone…` });
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')}/golive/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: myNumber.replace(/\s/g, '') }),
      });
      const data = (await res.json()) as { ok?: boolean; via?: string; message?: string };
      setCallStatus(
        res.ok && data.ok
          ? { kind: 'ok', msg: `📲 Ringing your phone now via ${data.via}. Answer it!` }
          : { kind: 'err', msg: data.message ?? 'Call failed — check your credentials.' },
      );
    } catch {
      setCallStatus({ kind: 'err', msg: 'Engine not reachable — run: bash run-desktop.sh' });
    }
  };

  const bridgeCall = async () => {
    setCallStatus({ kind: 'busy', msg: `Ringing ${myNumber} first, then connecting ${secondNumber}…` });
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')}/golive/bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first: myNumber.replace(/\s/g, ''),
          second: secondNumber.replace(/\s/g, ''),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; callerId?: string; message?: string };
      setCallStatus(
        res.ok && data.ok
          ? { kind: 'ok', msg: `📲 Answer the first phone — the second will ring showing ${data.callerId}.` }
          : { kind: 'err', msg: data.message ?? 'Bridge failed — check your credentials.' },
      );
    } catch {
      setCallStatus({ kind: 'err', msg: 'Engine not reachable — run: bash run-desktop.sh' });
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <Rocket className="h-5 w-5 text-ink-950" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Go Live</h1>
          <p className="text-sm text-slate-500">Connect a carrier and ring REAL phones — today, from this desktop.</p>
        </div>
      </div>

      {apiUp === false && (
        <Card className="flex items-center gap-3 border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          <CircleAlert className="h-5 w-5 shrink-0" />
          The engine isn&apos;t running. Start it first: <code className="rounded bg-black/30 px-2 py-0.5">bash run-desktop.sh</code>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1 — credentials */}
        <Card className="p-5">
          <SectionTitle
            title="Step 1 · Connect a carrier (free trial works)"
            action={twilioConfigured ? <Badge tone="brand"><CheckCircle2 className="h-3 w-3" /> connected</Badge> : <KeyRound className="h-4 w-4 text-slate-500" />}
          />
          <ol className="mb-4 space-y-1.5 text-xs leading-relaxed text-slate-400">
            <li>1. Create a free account at <a className="text-brand-300 underline" href="https://www.twilio.com/try-twilio" target="_blank" rel="noreferrer">twilio.com/try-twilio <ExternalLink className="inline h-3 w-3" /></a> — <b>verify your own +254 number</b> during signup (trial calls can only ring verified numbers).</li>
            <li>2. In the Twilio Console, click <b>Get a trial phone number</b> (free).</li>
            <li>3. Copy the <b>Account SID</b>, <b>Auth Token</b> and the trial number below.</li>
          </ol>
          <div className="space-y-3">
            <input className="input" placeholder="Business name (Zuri says this on calls)" value={business} onChange={(e) => setBusiness(e.target.value)} />
            <input className="input" placeholder="Account SID  (ACxxxxxxxx…)" value={sid} onChange={(e) => setSid(e.target.value)} />
            <input className="input" type="password" placeholder="Auth Token" value={token} onChange={(e) => setToken(e.target.value)} />
            <input className="input" placeholder="Your Twilio number  (+1xxxxxxxxxx)" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" placeholder="Caller ID for bridged calls (your verified +254… — optional)" value={callerId} onChange={(e) => setCallerId(e.target.value)} />
            <button className="btn-primary w-full" onClick={save} disabled={saveStatus.kind === 'busy'}>
              {saveStatus.kind === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Save & connect
            </button>
            {saveStatus.kind !== 'idle' && saveStatus.kind !== 'busy' && (
              <p className={`text-xs ${saveStatus.kind === 'ok' ? 'text-brand-300' : 'text-rose-300'}`}>{saveStatus.msg}</p>
            )}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Prefer a Kenyan number? Buy one at Africa&apos;s Talking (~KES 1,000/mo), put the keys in <code>.env</code>, and
            this page will use it automatically. Trial notes: Twilio plays a short trial message before connecting, and
            can only call the number you verified — upgrading (~$20) removes both limits.
          </p>
        </Card>

        {/* Step 2 — real calls */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title="Step 2 · Ring your real phone" action={<PhoneCall className="h-4 w-4 text-slate-500" />} />
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              Your actual phone rings and Zuri announces that your system is alive. This is a real call over the real
              phone network.
            </p>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="+2547XXXXXXXX" value={myNumber} onChange={(e) => setMyNumber(e.target.value)} />
              <button className="btn-primary" onClick={testCall} disabled={callStatus.kind === 'busy' || !twilioConfigured}>
                <Phone className="h-4 w-4" /> Call me now
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Step 3 · Bridge two real phones" action={<ArrowLeftRight className="h-4 w-4 text-slate-500" />} />
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              Your phone rings first; answer it and the second phone rings and connects — showing the caller ID you set
              above. A real phone-to-phone call routed through <b>your</b> system.
            </p>
            <div className="space-y-2">
              <input className="input" placeholder="Your phone  (+2547XXXXXXXX)" value={myNumber} onChange={(e) => setMyNumber(e.target.value)} />
              <input className="input" placeholder="Second phone  (+2547XXXXXXXX)" value={secondNumber} onChange={(e) => setSecondNumber(e.target.value)} />
              <button className="btn-ghost w-full" onClick={bridgeCall} disabled={callStatus.kind === 'busy' || !twilioConfigured}>
                <ArrowLeftRight className="h-4 w-4 text-brand-400" /> Bridge the call
              </button>
            </div>
          </Card>

          <LinkMyNumber />

          {callStatus.kind !== 'idle' && (
            <Card
              className={`flex items-center gap-3 p-4 text-sm ${
                callStatus.kind === 'ok'
                  ? 'border-brand-500/25 text-brand-200'
                  : callStatus.kind === 'err'
                    ? 'border-rose-500/25 text-rose-200'
                    : 'text-slate-300'
              }`}
            >
              {callStatus.kind === 'busy' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : callStatus.kind === 'ok' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <CircleAlert className="h-5 w-5 shrink-0" />
              )}
              {callStatus.msg}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
