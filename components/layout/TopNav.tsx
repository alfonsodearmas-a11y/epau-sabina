'use client';

// Sticky top navigation.
// Desktop (lg+): inline nav + 260px command-palette button + version/user tail.
// Mobile/tablet: hamburger → slide-out drawer with the same nav + palette entry.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';

import {
  SparkleIcon,
  SearchIcon,
  PinIcon,
  ColumnsIcon,
  TerminalIcon,
  CloseIcon,
} from '@/components/icons';
import type { IconProps } from '@/components/icons';
import { KeyCap } from '@/components/ui/KeyCap';

export interface TopNavProps {
  onOpenPalette: () => void;
}

interface NavItem { href: string; label: string; Icon: ComponentType<IconProps> }

const NAV: NavItem[] = [
  { href: '/workbench', label: 'Workbench', Icon: SparkleIcon },
  { href: '/catalog', label: 'Catalog', Icon: SearchIcon },
  { href: '/saved', label: 'Saved Views', Icon: PinIcon },
  { href: '/comparisons', label: 'Comparisons', Icon: ColumnsIcon },
  { href: '/admin', label: 'Admin', Icon: TerminalIcon },
];

function HamburgerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-7 h-7 rounded-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-300 to-gold-500" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-ink-950 text-[16px] leading-none">E</span>
        </div>
        <div className="absolute inset-0 border border-gold-200/50" />
      </div>
      <div className="leading-none">
        <div className="text-[13px] font-medium text-text-primary tracking-wide">EPAU</div>
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">Analyst Workbench</div>
      </div>
    </div>
  );
}

export function TopNav({ onOpenPalette }: TopNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/75 border-b border-white/5 safe-top safe-x">
      <div className="max-w-[1500px] mx-auto px-4 md:px-8 h-[52px] flex items-center gap-4 md:gap-6">
        <Logo />

        <nav className="hidden lg:flex items-center gap-0.5 ml-4">
          {NAV.map((it) => {
            const on = pathname?.startsWith(it.href) ?? false;
            const { Icon } = it;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-[12.5px] transition-colors ${
                  on ? 'bg-gold-300/10 text-gold-200 border border-gold-300/25' : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:flex ml-auto items-center gap-2">
          <button
            onClick={onOpenPalette}
            className="h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/8 hover:border-white/15 text-text-tertiary hover:text-text-secondary flex items-center gap-2 text-[11.5px] min-w-[260px]"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search indicators, views, comparisons</span>
            <span className="flex items-center gap-0.5"><KeyCap>⌘</KeyCap><KeyCap>K</KeyCap></span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="num">v2026.03.17</span>
            <span className="w-1 h-1 rounded-full bg-[#7FC29B]" />
            <span>Sabina, EPAU</span>
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="lg:hidden ml-auto w-11 h-11 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary flex items-center justify-center"
        >
          <HamburgerIcon className="w-5 h-5" />
        </button>
      </div>

      {drawerOpen ? (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute top-0 right-0 bottom-0 w-[84vw] max-w-[360px] glass-strong border-l border-white/10 flex flex-col safe-top safe-bottom">
            <div className="h-[52px] px-4 flex items-center justify-between border-b border-white/5">
              <Logo />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="w-11 h-11 rounded-md bg-white/[0.03] border border-white/10 text-text-tertiary flex items-center justify-center"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col p-3 gap-1">
              {NAV.map((it) => {
                const on = pathname?.startsWith(it.href) ?? false;
                const { Icon } = it;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`h-12 px-3 rounded-md flex items-center gap-2.5 text-[14px] transition-colors ${
                      on ? 'bg-gold-300/10 text-gold-200 border border-gold-300/25' : 'text-text-secondary hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {it.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-3">
              <button
                onClick={() => { setDrawerOpen(false); onOpenPalette(); }}
                className="w-full h-12 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary flex items-center gap-2.5 text-[13.5px]"
              >
                <SearchIcon className="w-4 h-4" />
                Search…
              </button>
            </div>

            <div className="mt-auto px-4 py-3 border-t border-white/5 text-[11px] text-text-tertiary flex items-center gap-2">
              <span className="num">v2026.03.17</span>
              <span className="w-1 h-1 rounded-full bg-[#7FC29B]" />
              <span>Sabina, EPAU</span>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
