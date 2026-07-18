'use client';

import { MessageCircle, Phone, Timer, TrendingUp } from 'lucide-react';
import { Avatar, Badge, Card, presenceLabel } from '@/components/ui';
import { team } from '@/lib/demo';
import { fmtDuration } from '@/lib/format';

const PRESENCE_TONE = {
  available: 'brand',
  oncall: 'rose',
  ringing: 'amber',
  dnd: 'rose',
  away: 'amber',
  offline: 'slate',
} as const;

export default function TeamPage() {
  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Team</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Live presence for every extension — who&apos;s free, who&apos;s ringing, who&apos;s on a call.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((t) => {
          const isAI = t.name === 'Zuri';
          return (
            <Card key={t.id} hover className={`p-4 ${isAI ? 'border-aiviolet-500/25' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar name={t.name} size={46} presence={t.presence} ai={isAI} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-white">{t.name}</span>
                    <Badge tone={isAI ? 'violet' : PRESENCE_TONE[t.presence]}>
                      {isAI ? 'Always on' : presenceLabel(t.presence)}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    Ext {t.ext} · {t.role}
                    {t.queue ? ` · ${t.queue} queue` : ''}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.05] pt-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-400" /> {t.callsToday} calls today
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Timer className="h-3.5 w-3.5 text-sky-400" /> avg {fmtDuration(t.avgHandleSec)}
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <button className="btn-primary flex-1 !py-2 text-xs">
                  <Phone className="h-3.5 w-3.5" /> Call ext {t.ext}
                </button>
                {!isAI && (
                  <button className="btn-ghost !px-3 !py-2">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
