'use client';

// Lightweight SVG charts following the dataviz spec: thin marks with 4px
// rounded data-ends, 2px surface gaps between stacked segments, recessive
// grid, legend for >=2 series, per-mark hover tooltips, and a table view.
// Series palette validated (OKLCH band + CVD separation) on surface #0E1524.

import { useState } from 'react';

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface BarDatum {
  label: string;
  values: Record<string, number>;
}

const SURFACE = '#0E1524';
const GRID = 'rgba(255,255,255,0.06)';
const TICK = '#64748B';

function niceMax(v: number): number {
  const pow = 10 ** Math.floor(Math.log10(v || 1));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function DataTable({ data, series }: { data: BarDatum[]; series: Series[] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-300">
        View as table
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <thead>
            <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-3 font-semibold"> </th>
              {series.map((s) => (
                <th key={s.key} className="py-1.5 pr-3 font-semibold">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-white/[0.04]">
                <td className="py-1.5 pr-3 font-medium text-slate-300">{d.label}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-1.5 pr-3 tabular-nums">
                    {d.values[s.key] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: number; color: string }[];
}

function Tooltip({ t }: { t: TooltipState }) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-lg border border-white/[0.1] bg-ink-900/95 p-2.5 shadow-card backdrop-blur"
      style={{ left: t.x, top: t.y, transform: 'translate(-50%, calc(-100% - 10px))' }}
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.title}</div>
      {t.rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-slate-200">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GroupedBars({
  data,
  series,
  height = 190,
}: {
  data: BarDatum[];
  series: Series[];
  height?: number;
}) {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const W = 560;
  const PAD = { l: 28, r: 4, t: 8, b: 20 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const max = niceMax(Math.max(...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0))));
  const groupW = plotW / data.length;
  const barW = Math.min(14, (groupW * 0.6) / series.length);

  return (
    <div className="relative">
      {tip && <Tooltip t={tip} />}
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Grouped bar chart">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH * (1 - f)} y2={PAD.t + plotH * (1 - f)} stroke={GRID} />
            <text x={PAD.l - 6} y={PAD.t + plotH * (1 - f) + 3} textAnchor="end" fontSize={9} fill={TICK}>
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="rgba(255,255,255,0.14)" />
        {data.map((d, gi) => {
          const gx = PAD.l + gi * groupW + groupW / 2;
          const total = series.length * barW + (series.length - 1) * 2;
          return (
            <g key={d.label}>
              {series.map((s, si) => {
                const v = d.values[s.key] ?? 0;
                const h = (v / max) * plotH;
                const x = gx - total / 2 + si * (barW + 2);
                const y = PAD.t + plotH - h;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 2)}
                    rx={4}
                    fill={s.color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={(e) => {
                      const host = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect();
                      const r = e.currentTarget.getBoundingClientRect();
                      setTip({
                        x: r.left - host.left + r.width / 2,
                        y: r.top - host.top,
                        title: d.label,
                        rows: series.map((ss) => ({ label: ss.label, value: d.values[ss.key] ?? 0, color: ss.color })),
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
              <text x={gx} y={height - 6} textAnchor="middle" fontSize={9} fill={TICK}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend series={series} />
      <DataTable data={data} series={series} />
    </div>
  );
}

export function StackedBars({
  data,
  series,
  height = 190,
}: {
  data: BarDatum[];
  series: Series[];
  height?: number;
}) {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const W = 560;
  const PAD = { l: 32, r: 4, t: 8, b: 20 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const max = niceMax(
    Math.max(...data.map((d) => series.reduce((a, s) => a + (d.values[s.key] ?? 0), 0))),
  );
  const groupW = plotW / data.length;
  const barW = Math.min(26, groupW * 0.45);

  return (
    <div className="relative">
      {tip && <Tooltip t={tip} />}
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Stacked bar chart">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH * (1 - f)} y2={PAD.t + plotH * (1 - f)} stroke={GRID} />
            <text x={PAD.l - 6} y={PAD.t + plotH * (1 - f) + 3} textAnchor="end" fontSize={9} fill={TICK}>
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="rgba(255,255,255,0.14)" />
        {data.map((d, gi) => {
          const x = PAD.l + gi * groupW + (groupW - barW) / 2;
          let yCursor = PAD.t + plotH;
          const hover = (e: React.MouseEvent<SVGRectElement>) => {
            const host = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect();
            const r = e.currentTarget.getBoundingClientRect();
            setTip({
              x: r.left - host.left + r.width / 2,
              y: r.top - host.top,
              title: d.label,
              rows: series.map((ss) => ({ label: ss.label, value: d.values[ss.key] ?? 0, color: ss.color })),
            });
          };
          return (
            <g key={d.label}>
              {series.map((s, si) => {
                const v = d.values[s.key] ?? 0;
                const h = (v / max) * plotH;
                yCursor -= h;
                const isTop = si === series.length - 1;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={yCursor}
                    width={barW}
                    height={Math.max(h - 2, 1)}
                    rx={isTop ? 4 : 1.5}
                    fill={s.color}
                    stroke={SURFACE}
                    strokeWidth={0}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={hover}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize={9} fill={TICK}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend series={series} />
      <DataTable data={data} series={series} />
    </div>
  );
}
