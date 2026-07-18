'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookUser,
  Bot,
  ChartColumn,
  Headset,
  House,
  MessageCircle,
  Phone,
  PhoneCall,
  Settings,
  Users,
  Voicemail as VoicemailIcon,
  Waypoints,
} from 'lucide-react';
import { Avatar, PresenceDot } from '@/components/ui';
import { me } from '@/lib/demo';

const NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/phone', label: 'Phone', icon: Phone },
  { href: '/calls', label: 'Calls', icon: PhoneCall },
  { href: '/inbox', label: 'Inbox', icon: MessageCircle, badge: 1 },
  { href: '/contacts', label: 'Contacts', icon: BookUser },
  { href: '/voicemail', label: 'Voicemail', icon: VoicemailIcon, badge: 1 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/zuri', label: 'Zuri AI', icon: Bot, ai: true },
  { href: '/analytics', label: 'Analytics', icon: ChartColumn },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_TABS = ['/', '/phone', '/calls', '/inbox', '/zuri'];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
        <Waypoints className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-white">
        Simu<span className="text-brand-400">PBX</span>
      </span>
    </Link>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-white/[0.06] p-4 lg:flex">
        <Logo />
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, badge, ai }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? 'nav-item-active' : ''}`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${ai && !isActive(href) ? 'text-aiviolet-400' : ''}`}
              />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-ink-950">
                  {badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="card flex items-center gap-3 p-3">
          <Avatar name={me.name} size={36} presence="available" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{me.name}</div>
            <div className="text-[11px] text-slate-500">
              Ext {me.ext} · {me.role}
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/85 px-4 py-3 backdrop-blur-lg lg:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-300">
              <Headset className="h-3 w-3" /> {me.did}
            </span>
            <div className="relative">
              <Avatar name={me.name} size={32} />
              <span className="absolute -bottom-0.5 -right-0.5">
                <PresenceDot presence="available" />
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-7">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink-900/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-3">
          {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map(
            ({ href, label, icon: Icon, badge, ai }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                    active ? (ai ? 'text-aiviolet-300' : 'text-brand-300') : 'text-slate-500'
                  }`}
                >
                  {active && (
                    <span
                      className={`absolute top-0 h-0.5 w-8 rounded-full ${
                        ai ? 'bg-aiviolet-400' : 'bg-brand-400'
                      }`}
                    />
                  )}
                  <span className="relative">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                    {badge ? (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-ink-950">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  {label}
                </Link>
              );
            },
          )}
        </div>
      </nav>
    </div>
  );
}
