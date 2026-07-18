'use client';

import { useState } from 'react';
import { ArrowLeft, Bot, MessageCircle, MessageSquareText, Phone, Send, Zap } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { threads, type Thread } from '@/lib/demo';

function ChannelBadge({ channel }: { channel: Thread['channel'] }) {
  return channel === 'whatsapp' ? (
    <Badge tone="brand">
      <MessageCircle className="h-3 w-3" /> WhatsApp
    </Badge>
  ) : (
    <Badge tone="sky">
      <MessageSquareText className="h-3 w-3" /> SMS
    </Badge>
  );
}

export default function InboxPage() {
  const [selected, setSelected] = useState<Thread | null>(threads[0]);
  const [draft, setDraft] = useState('');

  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Inbox</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          WhatsApp + SMS in one place, tied to each contact&apos;s call history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Thread list */}
        <Card className={`divide-y divide-white/[0.05] self-start lg:col-span-2 ${selected ? 'hidden lg:block' : ''}`}>
          {threads.map((t) => {
            const last = t.messages[t.messages.length - 1];
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03] ${
                  selected?.id === t.id ? 'bg-brand-500/[0.06]' : ''
                }`}
              >
                <Avatar name={t.contactName} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{t.contactName}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{last.at}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                      {last.from === 'auto' && <Zap className="mr-1 inline h-3 w-3 text-amber-400" />}
                      {last.text}
                    </p>
                    {t.unread > 0 && (
                      <span className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-ink-950">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        {/* Conversation */}
        <div className={`lg:col-span-3 ${selected ? '' : 'hidden lg:block'}`}>
          {selected ? (
            <Card className="flex min-h-[70dvh] flex-col lg:min-h-[560px]">
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                <button onClick={() => setSelected(null)} className="lg:hidden">
                  <ArrowLeft className="h-5 w-5 text-slate-400" />
                </button>
                <Avatar name={selected.contactName} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{selected.contactName}</div>
                  <div className="text-[11px] text-slate-500">{selected.number}</div>
                </div>
                <ChannelBadge channel={selected.channel} />
                <button className="btn-primary !px-3 !py-2">
                  <Phone className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {selected.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'them' ? '' : 'justify-end'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.from === 'them'
                          ? 'rounded-tl-sm bg-white/[0.06] text-slate-200'
                          : m.from === 'auto'
                            ? 'rounded-tr-sm border border-amber-500/25 bg-amber-500/10 text-amber-100'
                            : 'rounded-tr-sm bg-brand-500/20 text-brand-50'
                      }`}
                    >
                      {m.from === 'auto' && (
                        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          <Zap className="h-3 w-3" /> Auto follow-up
                        </span>
                      )}
                      {m.text}
                      <div className="mt-1 text-right text-[10px] text-slate-500">{m.at}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] p-3">
                <div className="flex items-center gap-2">
                  <button className="btn-ghost !p-2.5" title="Ask Zuri to draft a reply">
                    <Bot className="h-4 w-4 text-aiviolet-400" />
                  </button>
                  <input
                    className="input flex-1"
                    placeholder={`Reply on ${selected.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setDraft('')}
                  />
                  <button className="btn-primary !p-2.5" onClick={() => setDraft('')}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<MessageCircle className="h-6 w-6" />}
                title="Pick a conversation"
                hint="Missed calls trigger automatic WhatsApp/SMS follow-ups so no lead goes cold."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
