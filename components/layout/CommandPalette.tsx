'use client';

// Cmd+K / Ctrl+K command palette. Listens globally for keypresses via
// AppFrame and renders a modal overlay when open. Ported from
// docs/design/app.jsx with Next.js router-based navigation instead of
// route state callbacks.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { INDICATORS, SAVED_VIEWS } from '@/lib/mock';
import {
  SearchIcon,
  ChartIcon,
  PinIcon,
  ChevIcon,
  KeyboardIcon,
  SparkleIcon,
  ColumnsIcon,
  TerminalIcon,
} from '@/components/icons';
import type { IconProps } from '@/components/icons';
import type { ComponentType } from 'react';
import { KeyCap } from '@/components/ui/KeyCap';
import { CategoryPill } from '@/components/ui/Pill';
import { Divider } from '@/components/ui/Divider';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { Indicator } from '@/lib/types';

export interface CommandPaletteProps {
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/workbench', label: 'Go to Workbench', Icon: SparkleIcon },
  { href: '/catalog', label: 'Go to Catalog', Icon: SearchIcon },
  { href: '/saved', label: 'Go to Saved Views', Icon: PinIcon },
  { href: '/comparisons', label: 'Go to Comparisons', Icon: ColumnsIcon },
  { href: '/admin', label: 'Go to Admin', Icon: TerminalIcon },
];

// Given an indicator, derive the canonical canned workbench query.
// Matches docs/design/app.jsx.
function queryForIndicator(ind: Indicator): string {
  if (ind.id === 'nrf_inflows_actual')
    return 'NRF inflows actual vs budget 2020 to 2026';
  if (ind.id.startsWith('psc_'))
    return 'private sector credit by sector since 2015';
  if (ind.id === 'gdp_real_growth' || ind.id === 'gdp_nonoil_growth')
    return 'real GDP overall vs non-oil since 2017';
  if (ind.id === 'npl_ratio') return 'NPL ratio quarterly since 2017';
  return ind.name.toLowerCase();
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const inds = INDICATORS.filter(
    (i) => !q || i.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 6);
  const savedMatches = SAVED_VIEWS.filter(
    (v) =>
      !q ||
      v.name.toLowerCase().includes(q.toLowerCase()) ||
      v.query.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 3);
  const navItems = NAV_ITEMS.filter(
    (n) => !q || n.label.toLowerCase().includes(q.toLowerCase())
  );

  const openWorkbenchWithQuery = (query: string) => {
    router.push(`/workbench?q=${encodeURIComponent(query)}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] glass-strong rounded-xl gold-ring overflow-hidden fade-up"
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/8">
          <SearchIcon className="w-4 h-4 text-gold-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search indicators, views, or navigate…"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary"
          />
          <KeyCap>Esc</KeyCap>
        </div>
        <div className="max-h-[50vh] overflow-y-auto scroll-thin py-1">
          {inds.length ? (
            <>
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">
                Indicators
              </SectionLabel>
              {inds.map((i) => (
                <button
                  key={i.id}
                  onClick={() => openWorkbenchWithQuery(queryForIndicator(i))}
                  className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left"
                >
                  <ChartIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1">
                    {i.name}
                  </span>
                  <CategoryPill category={i.category} />
                  <span className="text-[10.5px] text-text-tertiary num min-w-[48px] text-right">
                    {i.latest}
                  </span>
                </button>
              ))}
            </>
          ) : null}
          {savedMatches.length ? (
            <>
              <Divider className="my-1" />
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">
                Saved views
              </SectionLabel>
              {savedMatches.map((v) => (
                <button
                  key={v.id}
                  onClick={() => openWorkbenchWithQuery(v.query)}
                  className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left"
                >
                  <PinIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1 truncate">
                    {v.name}
                  </span>
                  <span className="text-[10.5px] text-text-tertiary num">
                    {v.last_run}
                  </span>
                </button>
              ))}
            </>
          ) : null}
          {navItems.length ? (
            <>
              <Divider className="my-1" />
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">
                Navigate
              </SectionLabel>
              {navItems.map((n) => {
                const { Icon } = n;
                return (
                  <button
                    key={n.href}
                    onClick={() => {
                      router.push(n.href);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-[12.5px] text-text-secondary flex-1">
                      {n.label}
                    </span>
                    <ChevIcon className="w-3.5 h-3.5 -rotate-90 text-text-quat" />
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
        <div className="flex items-center justify-between px-4 h-9 border-t border-white/8 bg-white/[0.02] text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <KeyCap>↵</KeyCap> open
            </span>
            <span className="flex items-center gap-1">
              <KeyCap>↑</KeyCap>
              <KeyCap>↓</KeyCap> navigate
            </span>
          </div>
          <div className="flex items-center gap-1">
            <KeyboardIcon className="w-3.5 h-3.5" /> Cmd palette
          </div>
        </div>
      </div>
    </div>
  );
}
