'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  Clock,
  MessageCircle,
  MicOff,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Radio,
  Sparkles,
  Undo2,
  Voicemail,
} from 'lucide-react';
import { Avatar, Badge, Card, SectionTitle, StatTile } from '@/components/ui';
import { calls, me, queuesLive, todayStats, voicemails } from '@/lib/demo';
import { fmtDuration, fmtKES } from '@/lib/format';

const DIR_ICON = {
  inbound: { icon: PhoneIncoming, cls: 'text-brand-400' },
  outbound: { icon: PhoneOutgoing, cls: 'text-sky-400' },
  missed: { icon: PhoneMissed, cls: 'text-rose-400' },
  internal: { icon: PhoneCall, cls: 'text-slate-400' },
} as const;

export default function HomePage() {
  const firstName = me.name.split(' ')[0];
  const answeredPct = Math.round((todayStats.answered / todayStats.totalCalls) * 100);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
            Habari, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {me.company} · Friday 18 July · All lines healthy
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/phone" className="btn-primary">
            <Plus className="h-4 w-4" /> New call
          </Link>
          <Link href="/zuri" className="btn-ghost">
            <Sparkles className="h-4 w-4 text-aiviolet-400" /> Ask Zuri
          </Link>
        </div>
      </div>

      {/* Live banner */}
      <Card className="flex items-center gap-4 border-brand-500/20 bg-gradient-to-r from-brand-500/[0.08] to-transparent p-4">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
          <Radio className="h-5 w-5 text-brand-300" />
          <span className="absolute inset-0 rounded-xl bg-brand-400/30 animate-pulse-ring" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">
            {todayStats.activeCalls} calls live right now
          </div>
          <div className="text-xs text-slate-500">
            {todayStats.callbacksQueued} callbacks queued · longest wait 2m 02s in Support
          </div>
        </div>
        <Link
          href="/analytics"
          className="hidden text-xs font-semibold text-brand-300 hover:text-brand-200 sm:block"
        >
          Open wallboard →
        </Link>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<PhoneCall className="h-5 w-5" />}
          label="Calls today"
          value={String(todayStats.totalCalls)}
          sub={`${answeredPct}% answered`}
          tone="brand"
        />
        <StatTile
          icon={<Bot className="h-5 w-5" />}
          label="Handled by Zuri AI"
          value={String(todayStats.zuriHandled)}
          sub="31% of volume"
          tone="violet"
        />
        <StatTile
          icon={<Clock className="h-5 w-5" />}
          label="Avg. wait"
          value={`${todayStats.avgWaitSec}s`}
          sub="target < 45s"
          tone="sky"
        />
        <StatTile
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="M-Pesa collected on calls"
          value={fmtKES(todayStats.mpesaCollected)}
          sub="today"
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent activity */}
        <div className="lg:col-span-3">
          <SectionTitle
            title="Recent activity"
            action={
              <Link href="/calls" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
                View all
              </Link>
            }
          />
          <Card className="divide-y divide-white/[0.05]">
            {calls.slice(0, 5).map((c) => {
              const d = DIR_ICON[c.direction];
              const Icon = d.icon;
              return (
                <Link
                  key={c.id}
                  href="/calls"
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
                >
                  <Avatar name={c.contactName} size={38} ai={c.agent.startsWith('Zuri')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {c.contactName}
                      </span>
                      {c.tags?.includes('mpesa-paid') && <Badge tone="amber">M-Pesa</Badge>}
                      {c.tags?.includes('zuri') && <Badge tone="violet">Zuri</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon className={`h-3.5 w-3.5 ${d.cls}`} />
                      {c.startedAt} · {c.direction === 'missed' ? 'Missed' : fmtDuration(c.durationSec)}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600">{c.agent}</span>
                </Link>
              );
            })}
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <SectionTitle title="Queues right now" />
            <div className="space-y-3">
              {queuesLive.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{q.name}</span>
                    <Badge tone={q.waiting > 3 ? 'rose' : q.waiting > 0 ? 'amber' : 'brand'}>
                      {q.waiting} waiting
                    </Badge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className={`h-full rounded-full ${
                        q.serviceLevel > 90 ? 'bg-brand-400' : q.serviceLevel > 80 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${q.serviceLevel}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>
                      {q.agentsReady} ready · {q.agentsBusy} busy
                    </span>
                    <span>SL {q.serviceLevel}%</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="Needs your attention" />
            <div className="space-y-3">
              <Link href="/voicemail" className="card card-hover flex items-start gap-3 p-4">
                <span className="rounded-xl bg-rose-500/15 p-2 text-rose-300">
                  <Voicemail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    Urgent voicemail <Badge tone="rose">High</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {voicemails[0].contactName}: “{voicemails[0].transcript.slice(0, 90)}…”
                  </p>
                </div>
              </Link>
              <Link href="/inbox" className="card card-hover flex items-start gap-3 p-4">
                <span className="rounded-xl bg-brand-500/15 p-2 text-brand-300">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">1 unread WhatsApp reply</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Mohammed Ali replied to your missed-call follow-up.
                  </p>
                </div>
              </Link>
              <Link href="/calls" className="card card-hover flex items-start gap-3 p-4">
                <span className="rounded-xl bg-aiviolet-500/15 p-2 text-aiviolet-300">
                  <Undo2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">Callback promised for 8:00</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Zuri scheduled George Omondi (parts order) — tap to dial now.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
