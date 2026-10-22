'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** One button, because the alternative is a checkbox per message nobody ticks. */
export function MarkAllRead({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function mark() {
    setMessage(null);
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; marked?: number; message?: string } | null;
    if (!response.ok || result?.ok !== true) {
      setMessage(result?.message ?? 'Could not mark them read.');
      return;
    }
    setMessage(`${result.marked ?? 0} marked read.`);
    startTransition(() => router.refresh());
  }

  return (
    <span>
      <button className="outline-h" type="button" onClick={mark} disabled={pending} style={{ cursor: 'pointer' }}>
        Mark all as read
      </button>
      {message && (
        <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
          {message}
        </span>
      )}
    </span>
  );
}
