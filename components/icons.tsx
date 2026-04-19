// Inline SVG icons ported from docs/design/ui.jsx.
// Each icon is exported as a named React component that accepts standard SVG props.

import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;

export const MenuIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    {...p}
  >
    <path d="M2 4h12M2 8h12M2 12h12" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4" />
  </svg>
);

export const SlidersIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    {...p}
  >
    <path d="M3 6h9M15 6h2M3 14h3M9 14h8" />
    <circle cx="13.5" cy="6" r="1.6" fill="currentColor" />
    <circle cx="7.5" cy="14" r="1.6" fill="currentColor" />
  </svg>
);

export const CommandIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M7 4a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H5a2 2 0 1 0 2 2z" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M6 4.5v11a.75.75 0 0 0 1.16.63l9-5.5a.75.75 0 0 0 0-1.26l-9-5.5A.75.75 0 0 0 6 4.5Z" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M3 17V3M3 17h14M6 13V9M10 13V6M14 13v-2" />
  </svg>
);

export const TableIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="3" y="4" width="14" height="12" rx="1" />
    <path d="M3 8h14M3 12h14M10 4v12" />
  </svg>
);

export const ArchiveIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="2" y="4" width="16" height="4" rx="1" />
    <path d="M3 8v8h14V8M8 12h4" />
  </svg>
);

export const ColumnsIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="3" y="3" width="14" height="14" rx="1" />
    <path d="M10 3v14M3 7h14M3 13h14" />
  </svg>
);

export const TerminalIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="2" y="4" width="16" height="12" rx="1" />
    <path d="m5 9 3 2-3 2M11 13h4" />
  </svg>
);

export const WarnIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M10 3 2 17h16L10 3z" />
    <path d="M10 8v4M10 14.5v.5" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M5 5l10 10M15 5 5 15" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="m4 10 4 4 8-8" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="6" y="6" width="10" height="10" rx="1.5" />
    <path d="M4 14V5a1 1 0 0 1 1-1h9" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M10 3v10M5 9l5 5 5-5M4 17h12" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M12 3 7 8l-3 .5 7.5 7.5.5-3 5-5zM4 16l3-3" />
  </svg>
);

export const ChevIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="m6 8 4 4 4-4" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M4 10a6 6 0 0 1 10-4.5L16 7M16 4v3h-3M16 10a6 6 0 0 1-10 4.5L4 13M4 16v-3h3" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2" />
  </svg>
);

export const FilterIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M3 5h14l-5 7v4l-4-1v-3z" />
  </svg>
);

export const DotIcon = (p: IconProps) => (
  <svg viewBox="0 0 8 8" {...p}>
    <circle cx="4" cy="4" r="3" fill="currentColor" />
  </svg>
);

export const KeyboardIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <rect x="2" y="5" width="16" height="10" rx="1.5" />
    <path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01M5 11h.01M8 11h.01M11 11h.01M14 11h.01M7 14h6" />
  </svg>
);

export const FileIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M5 3h7l4 4v10H5z" />
    <path d="M12 3v4h4" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <circle cx="10" cy="10" r="7" />
    <path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14" />
  </svg>
);

// Aggregate map — convenient when code in the prototype indexes Icon[iconName].
// Keys mirror the original prototype's `Icon` object exactly.
export const Icon = {
  Search: SearchIcon,
  Sliders: SlidersIcon,
  Command: CommandIcon,
  Play: PlayIcon,
  Chart: ChartIcon,
  Table: TableIcon,
  Archive: ArchiveIcon,
  Columns: ColumnsIcon,
  Terminal: TerminalIcon,
  Warn: WarnIcon,
  Close: CloseIcon,
  Check: CheckIcon,
  Copy: CopyIcon,
  Download: DownloadIcon,
  Pin: PinIcon,
  Chev: ChevIcon,
  Refresh: RefreshIcon,
  Sparkle: SparkleIcon,
  Filter: FilterIcon,
  Dot: DotIcon,
  Keyboard: KeyboardIcon,
  File: FileIcon,
  Globe: GlobeIcon,
} as const;

export type IconName = keyof typeof Icon;
