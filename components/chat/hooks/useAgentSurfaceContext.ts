'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { ChatSurface, ChatSurfaceContext } from '@/lib/agent-client/types';

export type SurfaceResolution = {
  surface: ChatSurface;
  context?: ChatSurfaceContext;
  label: string;
  isExcluded: boolean;
};

export type ActiveChartRef = { indicator_ids: string[]; date_range?: { start: string; end: string } };

export type SurfaceExtras = {
  activeChart?: ActiveChartRef;
  activeLabel?: string;
};

export function resolveSurface(pathname: string | null, extras?: SurfaceExtras): SurfaceResolution {
  const path = pathname ?? '/';

  if (path.startsWith('/denied')) {
    return { surface: 'workbench', label: '', isExcluded: true };
  }

  if (path.startsWith('/catalog/')) {
    const indicatorId = path.replace('/catalog/', '').split('/')[0];
    return {
      surface: 'catalog',
      context: indicatorId ? { indicator_id: indicatorId } : undefined,
      label: extras?.activeLabel ? `Viewing: ${extras.activeLabel}` : 'On Catalog',
      isExcluded: false,
    };
  }
  if (path.startsWith('/catalog')) {
    return { surface: 'catalog', label: 'On Catalog', isExcluded: false };
  }

  if (path.startsWith('/saved/')) {
    const savedId = path.replace('/saved/', '').split('/')[0];
    return {
      surface: 'saved',
      context: savedId ? { saved_view_id: savedId } : undefined,
      label: extras?.activeLabel ? `Viewing: ${extras.activeLabel}` : 'On Saved Views',
      isExcluded: false,
    };
  }
  if (path.startsWith('/saved')) {
    return { surface: 'saved', label: 'On Saved Views', isExcluded: false };
  }

  if (path.startsWith('/comparisons/')) {
    const cmpId = path.replace('/comparisons/', '').split('/')[0];
    return {
      surface: 'comparisons',
      context: cmpId ? { comparison_table_id: cmpId } : undefined,
      label: extras?.activeLabel ? `Viewing: ${extras.activeLabel}` : 'On Comparisons',
      isExcluded: false,
    };
  }
  if (path.startsWith('/comparisons')) {
    return { surface: 'comparisons', label: 'On Comparisons', isExcluded: false };
  }

  if (path.startsWith('/admin')) {
    return { surface: 'admin', label: 'On Admin', isExcluded: false };
  }

  if (path.startsWith('/workbench') || path === '/') {
    return {
      surface: 'workbench',
      context: extras?.activeChart ? { active_chart: extras.activeChart } : undefined,
      label: 'On Workbench',
      isExcluded: false,
    };
  }

  return { surface: 'workbench', label: 'On Workbench', isExcluded: false };
}

export function useAgentSurfaceContext(extras?: SurfaceExtras): SurfaceResolution {
  const pathname = usePathname();
  return useMemo(() => resolveSurface(pathname, extras), [pathname, extras?.activeChart, extras?.activeLabel]);
}
