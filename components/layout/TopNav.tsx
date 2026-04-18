'use client';

// Sticky top navigation shell. Mirrors docs/design/app.jsx but uses Next.js
// App Router links + pathname matching instead of a route state.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  SparkleIcon,
  SearchIcon,
  PinIcon,
  ColumnsIcon,
  TerminalIcon,
} from '@/components/icons';
import type { IconProps } from '@/components/icons';
import type { ComponentType } from 'react';
import { KeyCap } from '@/components/ui/KeyCap';

export interface TopNavProps {
  onOpenPalette: () => void;
}

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
}

const NAV: NavItem[] = [
  { href: '/workbench', label: 'Workbench', Icon: SparkleIcon },
  { href: '/catalog', label: 'Catalog', Icon: SearchIcon },
  { href: '/saved', label: 'Saved Views', Icon: PinIcon },
  { href: '/comparisons', label: 'Comparisons', Icon: ColumnsIcon },
  { href: '/admin', label: 'Admin', Icon: TerminalIcon },
];

export function TopNav({ onOpenPalette }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/75 border-b border-white/5">
      <div className="max-w-[1500px] mx-auto px-8 h-[52px] flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold-300 to-gold-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-ink-950 text-[16px] leading-none">
                E
              </span>
            </div>
            <div className="absolute inset-0 border border-gold-200/50" />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-medium text-text-primary tracking-wide">
              EPAU
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">
              Analyst Workbench
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 ml-4">
          {NAV.map((it) => {
            const on = pathname?.startsWith(it.href) ?? false;
            const { Icon } = it;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-[12.5px] transition-colors ${
                  on
                    ? 'bg-gold-300/10 text-gold-200 border border-gold-300/25'
                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onOpenPalette}
            className="h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/8 hover:border-white/15 text-text-tertiary hover:text-text-secondary flex items-center gap-2 text-[11.5px] min-w-[260px]"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">
              Search indicators, views, comparisons
            </span>
            <span className="flex items-center gap-0.5">
              <KeyCap>⌘</KeyCap>
              <KeyCap>K</KeyCap>
            </span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="num">v2026.03.17</span>
            <span className="w-1 h-1 rounded-full bg-[#7FC29B]" />
            <span>Sabina, EPAU</span>
          </div>
        </div>
      </div>
    </header>
  );
}
