'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The enrol button.
 *
 * One button, three honest states. It never pretends a paid course is free,
 * and it never shows a checkout button that cannot work — no payment provider
 * is connected yet, so a paid course says so plainly instead of failing.
 */
export function EnrolButton({
  courseId,
  state,
  signedIn,
  label,
}: {
  courseId: string;
  state: 'free' | 'paid' | 'entitled';
  signedIn: boolean;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  if (!signedIn) {
    return (
      <div className="hero-actions">
        <a href={`/sign-up?next=/courses/${courseId}`} className="btn">
          Create an account to enrol
        </a>
        <a href={`/sign-in?next=/courses/${courseId}`} className="btn secondary">
          I already have an account
        </a>
      </div>
    );
  }

  if (state === 'paid') {
    // This used to be a disabled button with a notice saying checkout was not
    // open. Now there is a checkout, so it links there. Whether a provider is
    // configured is the buy page's problem, not this button's — it reports that
    // plainly, and it still creates the order so the attempt is recorded.
    return (
      <div>
        <div className="hero-actions">
          <a href={`/courses/${courseId}/buy`} className="btn">
            Buy — {label}
          </a>
          <a href="/learn" className="btn secondary">
            Go to my learning
          </a>
        </div>
      </div>
    );
  }

  async function enrol() {
    setMessage(null);
    const res = await fetch('/api/enrol', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    const json = (await res.json()) as { ok: boolean; message?: string };

    if (json.ok) {
      startTransition(() => router.push('/learn'));
      return;
    }
    setTone(res.status === 402 ? 'info' : 'error');
    setMessage(json.message ?? 'Enrolment failed. Please try again.');
  }

  return (
    <div>
      <div className="hero-actions">
        <button type="button" className="btn" onClick={enrol} disabled={pending}>
          {pending ? 'Enrolling…' : state === 'entitled' ? 'Continue enrolment' : 'Enrol — free'}
        </button>
        <a href="/learn" className="btn secondary">Go to my learning</a>
      </div>
      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : 'warn'}`} style={{ marginTop: '0.75rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}
