'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Lock, Mail, ShieldCheck, Waypoints, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('ian@wanjohigroup.co.ke');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Real auth: POST /api/pbx/auth/login → JWT. Demo falls straight through.
    setTimeout(() => router.push('/'), 500);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Waypoints className="h-7 w-7 text-ink-950" strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Simu<span className="text-brand-400">PBX</span>
          </h1>
          <p className="text-center text-sm text-slate-500">
            Your business phone, reimagined.
            <br />
            Sign in to your workspace.
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-10"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Protected with 2FA · TLS + SRTP
          </div>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
          <div className="card flex items-center gap-2 p-3">
            <Bot className="h-4 w-4 shrink-0 text-aiviolet-400" />
            Zuri AI answers in English & Swahili
          </div>
          <div className="card flex items-center gap-2 p-3">
            <Zap className="h-4 w-4 shrink-0 text-brand-400" />
            M-Pesa payments right on the call
          </div>
        </div>
      </div>
    </div>
  );
}
