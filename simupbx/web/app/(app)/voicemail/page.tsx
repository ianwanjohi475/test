'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Phone, Play, Sparkles, Trash2, Voicemail } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { voicemails } from '@/lib/demo';
import { fmtDuration } from '@/lib/format';

export default function VoicemailPage() {
  const [items, setItems] = useState(voicemails);

  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Voicemail</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Every message transcribed and urgency-ranked by AI — read it before you play it.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Voicemail className="h-6 w-6" />} title="No voicemails" hint="You're all caught up." />
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {items.map((v) => (
            <Card key={v.id} className={`p-5 ${!v.listened ? 'border-brand-500/25' : ''}`}>
              <div className="flex items-start gap-3">
                <Avatar name={v.contactName} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{v.contactName}</span>
                    {!v.listened && <Badge tone="brand">New</Badge>}
                    {v.urgency === 'high' && (
                      <Badge tone="rose">
                        <AlertTriangle className="h-3 w-3" /> Urgent
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {v.number} · {v.at} · {fmtDuration(v.durationSec)}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-primary !p-2.5" title="Call back">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost !p-2.5"
                    title="Delete"
                    onClick={() => setItems((xs) => xs.filter((x) => x.id !== v.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {v.urgencyReason && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-aiviolet-500/25 bg-aiviolet-500/10 p-3 text-xs leading-relaxed text-aiviolet-200">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {v.urgencyReason}
                </div>
              )}

              <blockquote className="mt-3 rounded-xl bg-white/[0.04] p-3.5 text-sm italic leading-relaxed text-slate-300">
                “{v.transcript}”
              </blockquote>

              <div className="mt-3 flex items-center gap-2">
                <button className="btn-ghost !py-2 text-xs">
                  <Play className="h-3.5 w-3.5" /> Play audio
                </button>
                <button className="btn-ghost !py-2 text-xs">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
