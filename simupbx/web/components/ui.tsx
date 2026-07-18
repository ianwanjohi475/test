'use client';

import { Search } from 'lucide-react';
import { avatarHue, initials } from '@/lib/format';
import type { Presence } from '@/lib/demo';

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function SectionTitle({
  title,
  action,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      {action}
    </div>
  );
}

const PRESENCE_STYLE: Record<Presence, { dot: string; label: string }> = {
  available: { dot: 'bg-brand-400', label: 'Available' },
  oncall: { dot: 'bg-rose-400', label: 'On a call' },
  ringing: { dot: 'bg-amber-400 animate-pulse', label: 'Ringing' },
  dnd: { dot: 'bg-rose-500', label: 'Do not disturb' },
  away: { dot: 'bg-amber-500', label: 'Away' },
  offline: { dot: 'bg-slate-600', label: 'Offline' },
};

export function PresenceDot({ presence, ring = true }: { presence: Presence; ring?: boolean }) {
  const s = PRESENCE_STYLE[presence];
  return (
    <span
      title={s.label}
      className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot} ${ring ? 'ring-2 ring-ink-850' : ''}`}
    />
  );
}

export function presenceLabel(p: Presence): string {
  return PRESENCE_STYLE[p].label;
}

export function Avatar({
  name,
  size = 40,
  presence,
  ai = false,
}: {
  name: string;
  size?: number;
  presence?: Presence;
  ai?: boolean;
}) {
  const hue = avatarHue(name);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full font-bold ${
          ai ? 'bg-gradient-to-br from-aiviolet-500 to-brand-500 text-white shadow-glow-violet' : ''
        }`}
        style={
          ai
            ? undefined
            : {
                background: `linear-gradient(135deg, hsl(${hue} 55% 26%), hsl(${hue} 60% 16%))`,
                color: `hsl(${hue} 80% 78%)`,
                fontSize: size * 0.36,
              }
        }
      >
        {ai ? '✦' : initials(name)}
      </div>
      {presence && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <PresenceDot presence={presence} />
        </span>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'brand' | 'violet' | 'amber' | 'rose' | 'sky' | 'slate';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-300',
    violet: 'bg-aiviolet-500/15 text-aiviolet-300',
    amber: 'bg-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/15 text-rose-300',
    sky: 'bg-sky-500/15 text-sky-300',
    slate: 'bg-white/[0.06] text-slate-400',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: 'brand' | 'violet' | 'amber' | 'rose' | 'sky';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-300',
    violet: 'bg-aiviolet-500/15 text-aiviolet-300',
    amber: 'bg-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/15 text-rose-300',
    sky: 'bg-sky-500/15 text-sky-300',
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2 ${tones[tone]}`}>{icon}</div>
        {sub && <span className="text-[11px] font-medium text-slate-500">{sub}</span>}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </Card>
  );
}

export function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        className="input pl-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        on ? 'bg-brand-500' : 'bg-ink-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="rounded-2xl bg-white/[0.04] p-4 text-slate-500">{icon}</div>
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      {hint && <div className="max-w-xs text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
