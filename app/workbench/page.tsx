import { Suspense } from 'react';

import { WorkbenchPageClient } from '@/components/workbench/WorkbenchPageClient';

export default function WorkbenchPage() {
  return (
    <Suspense fallback={null}>
      <WorkbenchPageClient />
    </Suspense>
  );
}
