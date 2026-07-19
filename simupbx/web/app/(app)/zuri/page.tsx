'use client';

import { useState } from 'react';
import {
  Bot,
  BookOpen,
  Languages,
  MessageSquareQuote,
  Mic2,
  PencilLine,
  PhoneForwarded,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Badge, Card, SectionTitle, Toggle } from '@/components/ui';
import { apiPost } from '@/lib/api';

const INITIAL_FAQS = [
  { q: 'What are your opening hours?', a: 'Mon–Fri 8am–6pm, Saturday 9am–1pm. Closed Sundays and public holidays.' },
  { q: 'Where are you located?', a: 'Enterprise Road, Industrial Area, Nairobi — opposite the GM plant.' },
  { q: 'Do you deliver?', a: 'Yes — free delivery within Nairobi for orders above KES 10,000, countrywide via our partners.' },
  { q: 'Bei ya cement ni ngapi?', a: 'Cement ni KES 780 kwa bag ya 50kg, na discount kwa orders za zaidi ya 100 bags.' },
];

const INTENTS = [
  { intent: 'Talk to sales / bei / order', dest: 'Sales queue', tone: 'brand' as const },
  { intent: 'Problem / complaint / msaada', dest: 'Support queue', tone: 'sky' as const },
  { intent: 'Pay / lipa / invoice', dest: 'M-Pesa IVR flow', tone: 'amber' as const },
  { intent: 'Anything unclear', dest: 'Take a message + WhatsApp follow-up', tone: 'violet' as const },
];

export default function ZuriPage() {
  const [enabled, setEnabled] = useState(true);
  const [afterHoursOnly, setAfterHoursOnly] = useState(false);
  const [screening, setScreening] = useState(true);
  const [swahili, setSwahili] = useState(true);
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [testMsg, setTestMsg] = useState('');
  const [chat, setChat] = useState<{ from: 'you' | 'zuri'; text: string }[]>([
    { from: 'zuri', text: 'Habari! I\'m Zuri, your AI receptionist. Ask me anything a caller would — try Swahili too. 🎧' },
  ]);

  const sendTest = async () => {
    if (!testMsg.trim()) return;
    const msg = testMsg;
    setChat((c) => [...c, { from: 'you', text: msg }]);
    setTestMsg('');

    // Live mode: the local API answers (real Claude when ANTHROPIC_API_KEY is set).
    const history = [...chat, { from: 'you' as const, text: msg }]
      .filter((m, i) => i > 0) // drop the canned greeting
      .map((m) => ({ role: m.from === 'you' ? ('user' as const) : ('assistant' as const), content: m.text }));
    const live = await apiPost<{ say: string; route: string | null }>('/sim/zuri', { history });
    if (live?.say) {
      setChat((c) => [
        ...c,
        { from: 'zuri', text: live.route ? `${live.say}  →  routing to ${live.route}` : live.say },
      ]);
      return;
    }

    // Demo fallback: answer from the local KB.
    setTimeout(() => {
      const kb = faqs.find((f) => msg.toLowerCase().split(' ').some((w) => w.length > 3 && f.q.toLowerCase().includes(w)));
      setChat((c) => [
        ...c,
        {
          from: 'zuri',
          text: kb
            ? kb.a
            : 'Asante! I\'d route this to the Sales team — nataka kukuunganisha na Amina. (Start the API for live Claude answers.)',
        },
      ]);
    }, 600);
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-aiviolet-500/25 p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-aiviolet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aiviolet-500 to-brand-500 text-2xl shadow-glow-violet">
              ✦
            </span>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white">
                Zuri <Badge tone="violet">AI Receptionist</Badge>
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Answers every call in natural conversation — English & Swahili — 24/7.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">{enabled ? 'Active' : 'Off'}</span>
            <Toggle on={enabled} onChange={setEnabled} label="Enable Zuri" />
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            ['41', 'calls handled today'],
            ['47s', 'avg. handle time'],
            ['96%', 'intent routing accuracy'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white/[0.04] p-3">
              <div className="text-xl font-extrabold text-white">{v}</div>
              <div className="mt-0.5 text-[10px] font-medium text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Behaviour */}
          <Card className="p-5">
            <SectionTitle title="Behaviour" action={<Wand2 className="h-4 w-4 text-slate-500" />} />
            <div className="space-y-4">
              <SettingRow
                icon={<Languages className="h-4 w-4 text-brand-400" />}
                title="Swahili + English"
                sub="Zuri detects the caller's language and answers in kind"
                control={<Toggle on={swahili} onChange={setSwahili} />}
              />
              <SettingRow
                icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
                title="Screen unknown callers"
                sub="Ask who's calling, transcribe it, whisper it to the agent before connecting"
                control={<Toggle on={screening} onChange={setScreening} />}
              />
              <SettingRow
                icon={<Mic2 className="h-4 w-4 text-sky-400" />}
                title="After-hours only"
                sub="Zuri answers only outside business hours (Mon–Fri 8–6, Sat 9–1)"
                control={<Toggle on={afterHoursOnly} onChange={setAfterHoursOnly} />}
              />
            </div>
          </Card>

          {/* Intent routing */}
          <Card className="p-5">
            <SectionTitle title="Intent routing" action={<PhoneForwarded className="h-4 w-4 text-slate-500" />} />
            <div className="space-y-2">
              {INTENTS.map((r) => (
                <div key={r.intent} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3.5 py-3">
                  <span className="text-sm text-slate-300">“{r.intent}”</span>
                  <Badge tone={r.tone}>→ {r.dest}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Knowledge base */}
          <Card className="p-5">
            <SectionTitle
              title="Knowledge base"
              action={
                <button className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200">
                  <Plus className="h-3.5 w-3.5" /> Add answer
                </button>
              }
            />
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <details key={i} className="group rounded-xl bg-white/[0.04]">
                  <summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3 text-sm font-medium text-slate-200">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-aiviolet-400" />
                    <span className="flex-1">{f.q}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setFaqs((xs) => xs.filter((_, j) => j !== i));
                      }}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
                    </button>
                  </summary>
                  <div className="flex items-start gap-2 px-3.5 pb-3 text-xs leading-relaxed text-slate-400">
                    <PencilLine className="mt-0.5 h-3 w-3 shrink-0" /> {f.a}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </div>

        {/* Test console */}
        <Card className="flex min-h-[480px] flex-col p-5">
          <SectionTitle title="Test Zuri" action={<MessageSquareQuote className="h-4 w-4 text-slate-500" />} />
          <div className="flex-1 space-y-3 overflow-y-auto">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'you' ? 'justify-end' : ''}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.from === 'zuri'
                      ? 'rounded-tl-sm border border-aiviolet-500/25 bg-aiviolet-500/10 text-aiviolet-100'
                      : 'rounded-tr-sm bg-brand-500/20 text-brand-50'
                  }`}
                >
                  {m.from === 'zuri' && (
                    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-aiviolet-300">
                      <Bot className="h-3 w-3" /> Zuri
                    </span>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder='Try: "Bei ya cement ni ngapi?"'
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTest()}
            />
            <button className="btn-primary !px-3.5" onClick={sendTest}>
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  sub,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-lg bg-white/[0.05] p-2">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      {control}
    </div>
  );
}
