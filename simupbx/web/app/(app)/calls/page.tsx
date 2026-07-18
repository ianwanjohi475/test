'use client';

import { useMemo, useState } from 'react';
import {
  CheckCheck,
  ChevronRight,
  Download,
  ListChecks,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react';
import { Avatar, Badge, Card, SearchInput, SectionTitle } from '@/components/ui';
import { calls, type CallRecord } from '@/lib/demo';
import { fmtClock, fmtDuration } from '@/lib/format';

const FILTERS = ['All', 'Inbound', 'Outbound', 'Missed', 'Recorded'] as const;

const DIR = {
  inbound: { icon: PhoneIncoming, cls: 'text-brand-400', label: 'Inbound' },
  outbound: { icon: PhoneOutgoing, cls: 'text-sky-400', label: 'Outbound' },
  missed: { icon: PhoneMissed, cls: 'text-rose-400', label: 'Missed' },
  internal: { icon: PhoneCall, cls: 'text-slate-400', label: 'Internal' },
} as const;

const SENTIMENT = {
  positive: { tone: 'brand' as const, label: '😊 Positive' },
  neutral: { tone: 'sky' as const, label: '😐 Neutral' },
  negative: { tone: 'rose' as const, label: '😟 Negative' },
};

export default function CallsPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [selected, setSelected] = useState<CallRecord | null>(calls[0]);

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      if (filter === 'Inbound' && c.direction !== 'inbound') return false;
      if (filter === 'Outbound' && c.direction !== 'outbound') return false;
      if (filter === 'Missed' && c.direction !== 'missed') return false;
      if (filter === 'Recorded' && !c.recorded) return false;
      if (!q) return true;
      const hay = [c.contactName, c.number, c.agent, ...(c.summary ?? []), ...(c.transcript?.map((t) => t.text) ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, filter]);

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Calls</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Search by caller, agent — or by <span className="text-aiviolet-300">what was said</span>.
          </p>
        </div>
        <button className="btn-ghost self-start">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* List */}
        <div className={`space-y-4 xl:col-span-2 ${selected ? 'hidden xl:block' : ''}`}>
          <SearchInput placeholder='Try "cement", "refund", a name…' value={q} onChange={setQ} />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-brand-500 text-ink-950'
                    : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.09]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Card className="divide-y divide-white/[0.05]">
            {filtered.map((c) => {
              const d = DIR[c.direction];
              const Icon = d.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03] ${
                    selected?.id === c.id ? 'bg-brand-500/[0.06]' : ''
                  }`}
                >
                  <Avatar name={c.contactName} size={38} ai={c.agent.startsWith('Zuri')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{c.contactName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon className={`h-3.5 w-3.5 ${d.cls}`} />
                      {c.startedAt} · {c.direction === 'missed' ? 'Missed' : fmtDuration(c.durationSec)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </button>
              );
            })}
          </Card>
        </div>

        {/* Detail */}
        <div className={`xl:col-span-3 ${selected ? '' : 'hidden xl:block'}`}>
          {selected ? (
            <CallDetail call={selected} onClose={() => setSelected(null)} />
          ) : (
            <Card className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-500">
              Select a call to see its recording, transcript and AI summary.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CallDetail({ call, onClose }: { call: CallRecord; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(62);
  const d = DIR[call.direction];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={call.contactName} size={48} ai={call.agent.startsWith('Zuri')} />
            <div>
              <div className="text-lg font-bold text-white">{call.contactName}</div>
              <div className="text-xs text-slate-500">
                {call.number} · via {call.via}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary !px-3 !py-2">
              <Phone className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="btn-ghost !px-3 !py-2 xl:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={call.direction === 'missed' ? 'rose' : 'brand'}>{d.label}</Badge>
          {call.sentiment && <Badge tone={SENTIMENT[call.sentiment].tone}>{SENTIMENT[call.sentiment].label}</Badge>}
          <Badge tone="slate">{call.startedAt}</Badge>
          <Badge tone="slate">{fmtDuration(call.durationSec)}</Badge>
          <Badge tone="slate">Agent: {call.agent}</Badge>
          {call.tags?.map((t) => (
            <Badge key={t} tone={t === 'mpesa-paid' ? 'amber' : 'violet'}>
              {t}
            </Badge>
          ))}
        </div>

        {/* Recording player */}
        {call.recorded && (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-ink-950 transition hover:bg-brand-400"
            >
              <Play className={`h-4 w-4 ${playing ? 'hidden' : ''}`} />
              <span className={`h-3 w-3 rounded-sm bg-ink-950 ${playing ? '' : 'hidden'}`} />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={call.durationSec}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{fmtClock(pos)}</span>
                <span>{fmtClock(call.durationSec)}</span>
              </div>
            </div>
            <button className="btn-ghost !p-2">
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}
      </Card>

      {call.summary && (
        <Card className="border-aiviolet-500/20 p-5">
          <SectionTitle
            title="AI summary"
            action={<Sparkles className="h-4 w-4 text-aiviolet-400" />}
          />
          <ul className="space-y-2">
            {call.summary.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-aiviolet-400" />
                {s}
              </li>
            ))}
          </ul>
          {call.actionItems && call.actionItems.length > 0 && (
            <>
              <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ListChecks className="h-3.5 w-3.5" /> Action items
              </div>
              <div className="flex flex-wrap gap-2">
                {call.actionItems.map((a, i) => (
                  <span key={i} className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200">
                    {a}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {call.transcript && (
        <Card className="p-5">
          <SectionTitle title="Transcript" action={<ScrollText className="h-4 w-4 text-slate-500" />} />
          <div className="space-y-3">
            {call.transcript.map((t, i) => {
              const isAI = t.speaker.includes('Zuri');
              const isAgent = !isAI && t.speaker !== call.contactName;
              return (
                <div key={i} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                  <Avatar name={t.speaker} size={28} ai={isAI} />
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isAI
                        ? 'border border-aiviolet-500/25 bg-aiviolet-500/10 text-aiviolet-100'
                        : isAgent
                          ? 'rounded-tr-sm bg-brand-500/15 text-brand-100'
                          : 'rounded-tl-sm bg-white/[0.05] text-slate-200'
                    }`}
                  >
                    <div className="mb-0.5 flex items-baseline gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t.speaker} <span className="font-normal">{t.at}</span>
                    </div>
                    {t.text}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
