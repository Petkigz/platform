'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Report = {
  claimed: number;
  sent: number;
  retried: number;
  bounced: number;
  failures: { to: string; error: string }[];
};

/**
 * Send what is due, now.
 *
 * The queue can sit there looking healthy while nothing dispatches it — a
 * stopped scheduler looks exactly like an empty queue from the outside. This
 * button is the difference between "I think it is running" and knowing: it runs
 * the same pass a cron job would, with the session of the person pressing it,
 * and reports what the database said.
 *
 * It says nothing about a provider it does not have. If no provider is
 * configured the answer is a sentence, not a spinner that ends in silence.
 */
export function DispatchNow({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');
  const [report, setReport] = useState<Report | null>(null);

  async function run() {
    setMessage(null);
    setReport(null);

    const res = await fetch('/api/admin/messages/dispatch', { method: 'POST' });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      summary?: string;
      blocked?: string | null;
      report?: Report;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'The queue was not dispatched.');
      return;
    }

    setTone(json.blocked ? 'error' : 'info');
    setMessage(json.blocked ?? json.summary ?? 'Done.');
    setReport(json.report ?? null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="stack">
      <button type="button" className="btn secondary" onClick={run} disabled={pending}>
        {pending ? 'Sending…' : 'Send what is due now'}
      </button>

      {disabled && (
        <p className="muted">
          Delivery is switched off, so this will claim nothing and send nothing.
          The switch is <code>delivery.notifications</code> on the flag dashboard.
        </p>
      )}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'info'}`} role="status">
          {message}
        </div>
      )}

      {report && report.failures.length > 0 && (
        <ul className="lessons">
          {report.failures.map((failure) => (
            <li key={failure.to + failure.error}>
              <span className="t">{failure.to}</span>
              <span className="muted">{failure.error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
