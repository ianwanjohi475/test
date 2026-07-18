'use client';

import {
  Activity,
  Clock,
  Download,
  Headset,
  Hourglass,
  PhoneCall,
  Trophy,
} from 'lucide-react';
import { GroupedBars, StackedBars } from '@/components/charts';
import { Avatar, Badge, Card, SectionTitle, StatTile } from '@/components/ui';
import { hourlyVolume, queuesLive, team, todayStats, weeklyOutcomes } from '@/lib/demo';
import { fmtDuration } from '@/lib/format';

// Series colors validated for CVD on the card surface (#0E1524) — see charts.tsx.
const VOLUME_SERIES = [
  { key: 'inbound', label: 'Inbound', color: '#059669' },
  { key: 'outbound', label: 'Outbound', color: '#0284C7' },
];
const OUTCOME_SERIES = [
  { key: 'answered', label: 'Answered by team', color: '#059669' },
  { key: 'zuri', label: 'Handled by Zuri AI', color: '#8B5CF6' },
  { key: 'missed', label: 'Missed', color: '#F43F5E' },
];

export default function AnalyticsPage() {
  const answeredPct = Math.round((todayStats.answered / todayStats.totalCalls) * 100);
  const leaderboard = [...team]
    .filter((t) => t.name !== 'Zuri')
    .sort((a, b) => b.callsToday - a.callsToday)
    .slice(0, 5);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">Live wallboard · Friday 18 July</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {['Today', 'Week', 'Month'].map((r, i) => (
              <button
                key={r}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  i === 0 ? 'bg-brand-500 text-ink-950' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.09]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="btn-ghost !py-2 text-xs">
            <Download className="h-3.5 w-3.5" /> Report
          </button>
        </div>
      </div>

      {/* Wallboard tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Activity className="h-5 w-5" />} label="Live calls" value={String(todayStats.activeCalls)} sub="right now" tone="brand" />
        <StatTile icon={<Hourglass className="h-5 w-5" />} label="Callers waiting" value={String(queuesLive.reduce((a, q) => a + q.waiting, 0))} sub="all queues" tone="amber" />
        <StatTile icon={<PhoneCall className="h-5 w-5" />} label="Answer rate" value={`${answeredPct}%`} sub="target 95%" tone="sky" />
        <StatTile icon={<Clock className="h-5 w-5" />} label="Avg. wait" value={`${todayStats.avgWaitSec}s`} sub="target < 45s" tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Call volume by hour — today" />
          <GroupedBars data={hourlyVolume.map((h) => ({ label: h.h, values: { inbound: h.inbound, outbound: h.outbound } }))} series={VOLUME_SERIES} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Outcomes this week" />
          <StackedBars data={weeklyOutcomes.map((d) => ({ label: d.d, values: { answered: d.answered, zuri: d.zuri, missed: d.missed } }))} series={OUTCOME_SERIES} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Queue detail */}
        <div className="lg:col-span-3">
          <SectionTitle title="Queue performance" />
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Queue</th>
                  <th className="px-4 py-3 font-semibold">Waiting</th>
                  <th className="px-4 py-3 font-semibold">Agents</th>
                  <th className="px-4 py-3 font-semibold">Avg wait</th>
                  <th className="px-4 py-3 font-semibold">Longest</th>
                  <th className="px-4 py-3 font-semibold">Service level</th>
                </tr>
              </thead>
              <tbody>
                {queuesLive.map((q) => (
                  <tr key={q.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 font-semibold text-white">{q.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone={q.waiting > 3 ? 'rose' : q.waiting > 0 ? 'amber' : 'brand'}>{q.waiting}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {q.agentsReady} <span className="text-slate-600">ready</span> · {q.agentsBusy}{' '}
                      <span className="text-slate-600">busy</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">{q.avgWaitSec}s</td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">{fmtDuration(q.longestWaitSec)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-700">
                          <div
                            className={`h-full rounded-full ${q.serviceLevel > 90 ? 'bg-brand-400' : q.serviceLevel > 80 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${q.serviceLevel}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-400">{q.serviceLevel}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <SectionTitle title="Agent leaderboard" action={<Trophy className="h-4 w-4 text-amber-400" />} />
          <Card className="divide-y divide-white/[0.05]">
            {leaderboard.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`w-5 text-center text-sm font-extrabold ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar name={t.name} size={36} presence={t.presence} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-[11px] text-slate-500">avg handle {fmtDuration(t.avgHandleSec)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-white">{t.callsToday}</div>
                  <div className="text-[10px] text-slate-500">calls</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-slate-500">
              <Headset className="h-3.5 w-3.5 text-aiviolet-400" />
              Zuri AI handled {todayStats.zuriHandled} more — deflecting 31% of volume.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
