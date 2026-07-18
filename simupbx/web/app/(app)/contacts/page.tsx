'use client';

import { useMemo, useState } from 'react';
import { CircleDollarSign, Mail, MessageCircle, Phone, Plus, UserRound } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, SearchInput } from '@/components/ui';
import { contacts } from '@/lib/demo';
import { fmtKES } from '@/lib/format';

const TAG_TONE: Record<string, 'brand' | 'violet' | 'amber' | 'rose' | 'sky' | 'slate'> = {
  customer: 'brand',
  vip: 'amber',
  lead: 'sky',
  hot: 'rose',
  supplier: 'violet',
};

export default function ContactsPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () =>
      contacts.filter((c) =>
        [c.name, c.company, c.phone, ...c.tags].join(' ').toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Contacts</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Shared phonebook · caller-ID lookup on every ring.
          </p>
        </div>
        <button className="btn-primary self-start">
          <Plus className="h-4 w-4" /> Add contact
        </button>
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput placeholder="Search name, company, number, tag…" value={q} onChange={setQ} />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<UserRound className="h-6 w-6" />} title="No contacts match" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} hover className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{c.name}</div>
                  {c.company && <div className="truncate text-xs text-slate-500">{c.company}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} tone={TAG_TONE[t] ?? 'slate'}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-500" /> {c.phone}
                </div>
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" /> {c.email}
                  </div>
                )}
                {c.mpesaPaid && (
                  <div className="flex items-center gap-2 text-amber-300">
                    <CircleDollarSign className="h-3.5 w-3.5" /> {fmtKES(c.mpesaPaid)} paid via M-Pesa
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span className="text-[11px] text-slate-600">
                  {c.totalCalls} calls · last {c.lastContacted}
                </span>
                <div className="flex gap-1.5">
                  <button className="btn-ghost !p-2" title="Message">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button className="btn-primary !p-2" title="Call">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
