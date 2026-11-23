'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/**
 * Reports that a plan was looked at, once, without making the page that
 * lists it a client component. Does nothing for a signed-out visitor: the
 * database refuses to record an event with nobody behind it.
 */
export function PlanSeen({ planId }: { planId: string }) {
  useEffect(() => {
    void track({ code: 'plan.viewed', subjectId: planId });
  }, [planId]);
  return null;
}
