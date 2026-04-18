// Severity pill mapping admin ingestion severity to the Pill tone scheme.

import { Pill, type PillTone } from '@/components/ui/Pill';
import type { IssueSeverity } from '@/lib/types';

const TONE: Record<IssueSeverity, PillTone> = {
  high: 'danger',
  medium: 'warn',
  low: 'cool',
};

export function SeverityPill({ s }: { s: IssueSeverity }) {
  return <Pill tone={TONE[s] ?? 'neutral'}>{s}</Pill>;
}
