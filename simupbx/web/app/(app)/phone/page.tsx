'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Circle,
  Delete,
  Grip,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneForwarded,
  PhoneOff,
  Play,
  Sparkles,
  UserPlus,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Avatar, Badge, Card } from '@/components/ui';
import { apiPost, openRealtime } from '@/lib/api';
import { contacts, team } from '@/lib/demo';
import { fmtClock } from '@/lib/format';
import { Softphone, type CallPhase, type PhoneStatus } from '@/lib/sip';

const KEYS = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
] as const;

const LIVE_TRANSCRIPT = [
  { speaker: 'Them', text: 'Habari, naitwa Peter — nauliza kuhusu delivery ya kesho.' },
  { speaker: 'You', text: 'Peter! Yes, your order is packed and ready for tomorrow morning.' },
  { speaker: 'Zuri assist', text: 'Suggested: confirm the delivery window is 8–11am and offer M-Pesa settlement now.', ai: true },
];

export default function PhonePage() {
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState<PhoneStatus>('demo');
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [remote, setRemote] = useState('');
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [recording, setRecording] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);
  const [showKeypadInCall, setShowKeypadInCall] = useState(false);
  const phoneRef = useRef<Softphone | null>(null);

  // Live engine (local API + simulation/provider events over WebSocket)
  const [engineLive, setEngineLive] = useState(false);
  const [screening, setScreening] = useState<string | null>(null);
  const [liveLines, setLiveLines] = useState<{ speaker: string; text: string; ai?: boolean }[]>([]);
  const liveCallId = useRef<number | null>(null);

  useEffect(() => {
    const phone = new Softphone({
      onStatus: setStatus,
      onPhase: (p, r) => {
        setPhase(p);
        if (r) setRemote(r);
        if (p === 'idle') {
          setElapsed(0);
          setMuted(false);
          setHeld(false);
          setTransferOpen(false);
          setShowKeypadInCall(false);
        }
      },
    });
    phoneRef.current = phone;
    // Live mode: fetch SIP creds from the API and connect.
    const wss = process.env.NEXT_PUBLIC_SIP_WSS;
    const domain = process.env.NEXT_PUBLIC_SIP_DOMAIN;
    const ext = process.env.NEXT_PUBLIC_SIP_EXT;
    const pass = process.env.NEXT_PUBLIC_SIP_PASSWORD;
    if (wss && domain && ext && pass) {
      phone.connect({ wssUrl: wss, domain, extension: ext, password: pass }).catch(() => setStatus('error'));
    }
    // Realtime feed from the local API: incoming calls ring this softphone,
    // transcripts stream into the assist panel — in real time.
    const stopRealtime = openRealtime((ev) => {
      setEngineLive(true);
      if (ev.event === 'call.incoming' && liveCallId.current === null) {
        liveCallId.current = ev.data.callId as number;
        setRemote(ev.data.name as string);
        setNumber('');
        setScreening(ev.data.screening as string);
        setLiveLines([]);
        setPhase('ringing-in');
      } else if (ev.data.callId === liveCallId.current && liveCallId.current !== null) {
        if (ev.event === 'call.transcript') {
          setLiveLines((ls) => [...ls, { speaker: ev.data.speaker as string, text: ev.data.text as string }]);
        } else if (ev.event === 'call.assist') {
          setLiveLines((ls) => [...ls, { speaker: 'Zuri assist', text: ev.data.text as string, ai: true }]);
        } else if (ev.event === 'call.ended' || ev.event === 'call.missed') {
          liveCallId.current = null;
          setScreening(null);
          setPhase('ended');
          setTimeout(() => setPhase('idle'), 900);
        }
      }
    });

    return () => {
      stopRealtime();
      phone.disconnect().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const inCall = phase !== 'idle' && phase !== 'ended';
  const knownContact = useMemo(
    () => contacts.find((c) => c.phone.replace(/\s/g, '').endsWith(number.replace(/\s/g, '').slice(-9)) && number.length > 6),
    [number],
  );

  const dial = (target?: string) => {
    const n = target ?? number;
    if (!n) return;
    setRemote(n);
    phoneRef.current?.call(n, process.env.NEXT_PUBLIC_SIP_DOMAIN ?? 'simupbx.local');
  };

  const press = (k: string) => {
    if (inCall && phase === 'active') phoneRef.current?.sendDtmf(k);
    else setNumber((n) => n + k);
  };

  const displayName = knownContact?.name ?? remote;

  return (
    <div className="animate-fade-up">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        {/* ===== Phone panel ===== */}
        <Card className="relative overflow-hidden p-6">
          {/* status pill */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-white">Softphone</h1>
            <span
              className={`chip ${
                status === 'registered' || engineLive
                  ? 'bg-brand-500/15 text-brand-300'
                  : status === 'demo'
                    ? 'bg-aiviolet-500/15 text-aiviolet-300'
                    : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {status === 'registered' || engineLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {status === 'registered'
                ? 'Ext 100 · Registered'
                : engineLive
                  ? 'Ext 100 · Live engine connected'
                  : status === 'demo'
                    ? 'Demo mode — start the API to go live'
                    : status}
            </span>
          </div>

          {!inCall ? (
            <>
              {/* Number entry */}
              <div className="mb-1 flex h-14 items-center justify-center gap-2">
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^0-9+*#]/g, ''))}
                  placeholder="+254 7…"
                  className="w-full bg-transparent text-center text-3xl font-bold tracking-wide text-white outline-none placeholder:text-ink-600"
                />
              </div>
              <div className="mb-4 h-5 text-center text-xs font-medium text-brand-300">
                {knownContact ? `${knownContact.name} · ${knownContact.company ?? 'Contact'}` : ' '}
              </div>

              {/* Keypad */}
              <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-3">
                {KEYS.map(([k, sub]) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="flex h-[64px] flex-col items-center justify-center rounded-2xl bg-white/[0.04] transition hover:bg-white/[0.09] active:scale-95"
                  >
                    <span className="text-2xl font-semibold text-white">{k}</span>
                    {sub && <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500">{sub}</span>}
                  </button>
                ))}
              </div>

              {/* Call / delete row */}
              <div className="mx-auto mt-5 flex max-w-[280px] items-center justify-center gap-6">
                <span className="w-12" />
                <button
                  onClick={() => dial()}
                  disabled={!number}
                  className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-brand-500 text-ink-950 shadow-glow transition hover:bg-brand-400 active:scale-95 disabled:opacity-40 disabled:shadow-none"
                >
                  <Phone className="h-7 w-7" />
                </button>
                <button
                  onClick={() => setNumber((n) => n.slice(0, -1))}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] ${number ? '' : 'invisible'}`}
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            /* ===== In-call screen ===== */
            <div className="flex flex-col items-center pt-2">
              <div className="relative mb-4">
                <Avatar name={displayName || 'Unknown'} size={96} />
                {(phase === 'dialing' || phase === 'ringing-in') && (
                  <span className="absolute inset-0 rounded-full border-2 border-brand-400/60 animate-pulse-ring" />
                )}
              </div>
              <div className="text-xl font-bold text-white">{displayName || 'Unknown'}</div>
              <div className="mt-1 text-sm text-slate-500">{knownContact ? remote || knownContact.phone : remote}</div>
              <div className="mt-2 flex items-center gap-2">
                {phase === 'dialing' && <Badge tone="sky">Calling…</Badge>}
                {phase === 'ringing-in' && <Badge tone="amber">Incoming call</Badge>}
                {phase === 'active' && (
                  <Badge tone="brand">
                    <Circle className="h-2 w-2 fill-current" /> {fmtClock(elapsed)}
                  </Badge>
                )}
                {phase === 'held' && <Badge tone="amber">On hold</Badge>}
                {recording && phase === 'active' && (
                  <Badge tone="rose">
                    <Circle className="h-2 w-2 animate-pulse fill-current" /> REC
                  </Badge>
                )}
              </div>

              {screening && (phase === 'ringing-in' || phase === 'active') && (
                <div className="mt-3 flex max-w-xs items-start gap-2 rounded-xl border border-aiviolet-500/25 bg-aiviolet-500/10 p-3 text-xs leading-relaxed text-aiviolet-200">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {screening}
                </div>
              )}

              {/* voice bars */}
              {phase === 'active' && (
                <div className="mt-5 flex h-8 items-end gap-1">
                  {[0.4, 0.8, 0.6, 1, 0.5, 0.9, 0.7, 0.4, 0.8, 0.6].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-brand-400/80 animate-wave"
                      style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }}
                    />
                  ))}
                </div>
              )}

              {/* controls */}
              <div className="mt-7 grid grid-cols-3 gap-x-8 gap-y-5">
                <CallBtn
                  label={muted ? 'Unmute' : 'Mute'}
                  active={muted}
                  onClick={() => {
                    phoneRef.current?.mute(!muted);
                    setMuted(!muted);
                  }}
                >
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </CallBtn>
                <CallBtn
                  label={held ? 'Resume' : 'Hold'}
                  active={held}
                  onClick={() => {
                    phoneRef.current?.hold(!held);
                    setHeld(!held);
                  }}
                >
                  {held ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </CallBtn>
                <CallBtn label="Keypad" active={showKeypadInCall} onClick={() => setShowKeypadInCall((v) => !v)}>
                  <Grip className="h-5 w-5" />
                </CallBtn>
                <CallBtn label="Transfer" active={transferOpen} onClick={() => setTransferOpen((v) => !v)}>
                  <ArrowRightLeft className="h-5 w-5" />
                </CallBtn>
                <CallBtn label="Add call" onClick={() => undefined}>
                  <UserPlus className="h-5 w-5" />
                </CallBtn>
                <CallBtn label={recording ? 'Recording' : 'Record'} active={recording} onClick={() => setRecording(!recording)}>
                  <Circle className={`h-5 w-5 ${recording ? 'fill-rose-400 text-rose-400' : ''}`} />
                </CallBtn>
              </div>

              {showKeypadInCall && (
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {KEYS.map(([k]) => (
                    <button
                      key={k}
                      onClick={() => press(k)}
                      className="h-11 w-16 rounded-xl bg-white/[0.05] text-lg font-semibold text-white transition hover:bg-white/[0.1] active:scale-95"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}

              {transferOpen && (
                <div className="mt-6 w-full max-w-xs">
                  <div className="mb-2 text-center text-xs font-semibold text-slate-500">
                    Transfer to…
                  </div>
                  <div className="space-y-1.5">
                    {team
                      .filter((t) => t.ext !== '100')
                      .slice(0, 4)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            phoneRef.current?.transfer(t.ext, process.env.NEXT_PUBLIC_SIP_DOMAIN ?? 'simupbx.local');
                          }}
                          className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.09]"
                        >
                          <Avatar name={t.name} size={28} presence={t.presence} ai={t.name === 'Zuri'} />
                          <span className="flex-1 text-left text-sm font-medium text-white">{t.name}</span>
                          <span className="text-xs text-slate-500">ext {t.ext}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* answer / hangup */}
              <div className="mt-8 flex items-center gap-8">
                {phase === 'ringing-in' && (
                  <button
                    onClick={() => {
                      if (liveCallId.current !== null) {
                        apiPost(`/sim/calls/${liveCallId.current}/answer`, {});
                        setPhase('active');
                      } else phoneRef.current?.answer();
                    }}
                    className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-brand-500 text-ink-950 shadow-glow transition hover:bg-brand-400 active:scale-95"
                  >
                    <Phone className="h-6 w-6" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (liveCallId.current !== null) {
                      apiPost(`/sim/calls/${liveCallId.current}/hangup`, {});
                      liveCallId.current = null;
                      setScreening(null);
                      setPhase('ended');
                      setTimeout(() => setPhase('idle'), 900);
                    } else phoneRef.current?.hangup();
                  }}
                  className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400 active:scale-95"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ===== Side panel: quick dial + live AI assist ===== */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Quick dial</h2>
              <Badge tone="slate">
                <Volume2 className="h-3 w-3" /> Speed dials
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {contacts.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => dial(c.phone.replace(/\s/g, ''))}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.05]"
                >
                  <Avatar name={c.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{c.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{c.phone}</div>
                  </div>
                  <PhoneForwarded className="h-4 w-4 shrink-0 text-brand-400" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="border-aiviolet-500/20 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg bg-aiviolet-500/15 p-1.5">
                <Sparkles className="h-4 w-4 text-aiviolet-300" />
              </span>
              <h2 className="text-sm font-bold text-white">Live AI assist</h2>
              <Badge tone="violet">agent-only</Badge>
            </div>
            {inCall && phase === 'active' ? (
              <div className="max-h-[420px] space-y-3 overflow-y-auto">
                {(liveLines.length ? liveLines : LIVE_TRANSCRIPT).map((l, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      'ai' in l && l.ai
                        ? 'border border-aiviolet-500/25 bg-aiviolet-500/10 text-aiviolet-200'
                        : 'bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {l.speaker}
                    </span>
                    {l.text}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                When you&apos;re on a call, the live transcript scrolls here with Zuri&apos;s
                suggestions — answers from your knowledge base, the caller&apos;s history, and
                next-best actions. Only you can see it.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function CallBtn({
  children,
  label,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 ${
          active ? 'bg-white text-ink-950' : 'bg-white/[0.06] text-white hover:bg-white/[0.12]'
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
    </button>
  );
}
