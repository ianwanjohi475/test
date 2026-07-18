'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  GitBranch,
  Globe,
  Hash,
  Landmark,
  Lock,
  Network,
  Phone,
  Plus,
  ShieldCheck,
  Signal,
  Users,
  Voicemail,
  Waypoints,
} from 'lucide-react';
import { Badge, Card, SectionTitle, Toggle } from '@/components/ui';

const NUMBERS = [
  { label: 'Nairobi Main', num: '+254 709 100 100', provider: "Africa's Talking", route: 'Zuri AI → Sales/Support', status: 'live' },
  { label: 'Sales Line', num: '+254 709 100 200', provider: "Africa's Talking", route: 'Sales queue direct', status: 'live' },
  { label: 'Mombasa Line', num: '+254 709 100 300', provider: 'Telnyx SIP', route: 'IVR: coast menu', status: 'live' },
];

const IVR_TREE = [
  { key: '·', label: 'Zuri greets (EN/SW) — “Karibu Wanjohi Group…”', depth: 0, tone: 'violet' as const },
  { key: '1', label: 'Sales queue (Amina, Faith)', depth: 1, tone: 'brand' as const },
  { key: '2', label: 'Support queue (Brian, Grace)', depth: 1, tone: 'sky' as const },
  { key: '3', label: 'Lipa na M-Pesa — STK push flow', depth: 1, tone: 'amber' as const },
  { key: '4', label: 'Accounts (ext 104)', depth: 1, tone: 'slate' as const },
  { key: '9', label: 'Leave a message → transcribed + WhatsApp alert', depth: 1, tone: 'rose' as const },
];

const HOURS = [
  ['Monday – Friday', '8:00 — 18:00'],
  ['Saturday', '9:00 — 13:00'],
  ['Sunday & public holidays', 'Zuri answers · after-hours flow'],
];

export default function SettingsPage() {
  const [failover, setFailover] = useState(true);
  const [intlCalls, setIntlCalls] = useState(false);
  const [recordAll, setRecordAll] = useState(true);
  const [notice, setNotice] = useState(true);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Numbers, routing, security — the engine room.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Numbers & trunks */}
        <Card className="p-5">
          <SectionTitle
            title="Phone numbers & trunks"
            action={
              <button className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200">
                <Plus className="h-3.5 w-3.5" /> Add number
              </button>
            }
          />
          <div className="space-y-2.5">
            {NUMBERS.map((n) => (
              <div key={n.num} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3.5">
                <span className="rounded-lg bg-brand-500/15 p-2 text-brand-300">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{n.label}</span>
                    <Badge tone="brand">
                      <Signal className="h-3 w-3" /> {n.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {n.num} · {n.provider}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <ArrowRight className="h-3 w-3 text-slate-600" /> {n.route}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-600" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5">
            <div className="flex items-center gap-2.5">
              <Network className="h-4 w-4 text-amber-300" />
              <div>
                <div className="text-sm font-semibold text-white">Offline failover</div>
                <div className="text-[11px] text-slate-500">If the PBX is unreachable, forward to +254 7•• ••• •••</div>
              </div>
            </div>
            <Toggle on={failover} onChange={setFailover} />
          </div>
        </Card>

        {/* IVR builder */}
        <Card className="p-5">
          <SectionTitle title="Call flow — Nairobi Main" action={<GitBranch className="h-4 w-4 text-slate-500" />} />
          <div className="space-y-1.5">
            {IVR_TREE.map((n, i) => (
              <div key={i} className="flex items-center gap-2.5" style={{ paddingLeft: n.depth * 24 }}>
                {n.depth > 0 && <span className="h-px w-4 bg-ink-600" />}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                    n.depth === 0 ? 'bg-aiviolet-500/20 text-aiviolet-300' : 'bg-white/[0.06] text-slate-300'
                  }`}
                >
                  {n.key}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <span className="truncate text-sm text-slate-300">{n.label}</span>
                  <Badge tone={n.tone}>{n.depth === 0 ? 'greeting' : `press ${n.key}`}</Badge>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-4 w-full text-xs">
            <Plus className="h-3.5 w-3.5" /> Add menu option
          </button>
        </Card>

        {/* Business hours */}
        <Card className="p-5">
          <SectionTitle title="Business hours" action={<CalendarClock className="h-4 w-4 text-slate-500" />} />
          <div className="space-y-2">
            {HOURS.map(([d, h]) => (
              <div key={d} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-3">
                <span className="text-sm font-medium text-slate-300">{d}</span>
                <span className="text-xs font-semibold text-slate-400">{h}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <Globe className="h-3.5 w-3.5" /> Africa/Nairobi · Kenyan public holidays preloaded (Madaraka, Mashujaa, Jamhuri…)
          </div>
        </Card>

        {/* Recording & M-Pesa */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title="Call recording" action={<Voicemail className="h-4 w-4 text-slate-500" />} />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Record all calls</div>
                  <div className="text-xs text-slate-500">MP3 · 90-day retention · role-based access</div>
                </div>
                <Toggle on={recordAll} onChange={setRecordAll} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Play legal notice</div>
                  <div className="text-xs text-slate-500">“This call may be recorded…” before connecting</div>
                </div>
                <Toggle on={notice} onChange={setNotice} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="M-Pesa (Daraja)" action={<CircleDollarSign className="h-4 w-4 text-amber-400" />} />
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3.5">
              <span className="rounded-lg bg-amber-500/15 p-2 text-amber-300">
                <Landmark className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  Paybill 4 001 002 <Badge tone="brand">connected</Badge>
                </div>
                <div className="text-xs text-slate-500">STK push on IVR option 3 · auto-receipt SMS · logged to contact</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Security strip */}
      <Card className="p-5">
        <SectionTitle title="Security" action={<ShieldCheck className="h-4 w-4 text-brand-400" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Lock className="h-4 w-4" />, t: 'TLS + SRTP', s: 'All media encrypted · WSS-only browser clients' },
            { icon: <ShieldCheck className="h-4 w-4" />, t: 'SIP brute-force shield', s: 'Auto-ban after 5 failed registrations' },
            { icon: <Hash className="h-4 w-4" />, t: 'Strong SIP secrets', s: '24-char random per extension · admin 2FA' },
            { icon: <Waypoints className="h-4 w-4" />, t: 'Toll-fraud guard', s: `International calls ${intlCalls ? 'allowlisted' : 'blocked'} · rate caps` },
          ].map((x) => (
            <div key={x.t} className="rounded-xl bg-white/[0.04] p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-brand-300">{x.icon}</span> {x.t}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{x.s}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3.5">
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Users className="h-4 w-4 text-rose-300" />
            Allow international outbound calls (per-user allowlist applies)
          </div>
          <Toggle on={intlCalls} onChange={setIntlCalls} />
        </div>
      </Card>
    </div>
  );
}
