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
