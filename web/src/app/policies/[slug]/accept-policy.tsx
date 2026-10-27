'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { acceptanceLabel, describePolicyError } from '@/lib/policies';

/**
 * The one button that records consent.
 *
 * It sends the **slug**, never a version id. The database resolves the version
 * that is live at that moment, so a page left open across a publication cannot
 * collect agreement to the version the reader is no longer looking at.
 */
export function AcceptPolicy({
  slug,
  title,
  versionNumber,
  acceptedAt,
}: {
  slug: string;
  title: string;
  versionNumber: number;
  acceptedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedAt, setAgreedAt] = useState<string | null>(acceptedAt);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('accept_policy', { p_slug: slug });
      if (rpcError) {
        setError(describePolicyError(rpcError.message));
        return;
      }
      const result = data as { acceptedAt?: string; versionNumber?: number } | null;
      setAgreedAt(result?.acceptedAt ?? new Date().toISOString());
      // The page also carries the outstanding count, so it is refetched rather
      // than patched by hand.
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '0.65rem' }}>
      <p className="muted" style={{ margin: 0 }}>
        {agreedAt
          ? `You have agreed to this version of the ${title.toLowerCase()}. The time is kept against your account, and the text you agreed to cannot be edited afterwards.`
          : `Agreeing records that you have read version ${versionNumber} and accept it. The version and the time are kept against your account, and this text cannot be edited afterwards — a change is published as a new version.`}
      </p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div>
        <button type="submit" className="btn" disabled={busy || agreedAt !== null}>
          {busy ? 'Recording…' : acceptanceLabel(agreedAt)}
        </button>
      </div>
      {agreedAt && (
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Nothing further is needed. <a href="#your-agreement">Where this is kept</a>{' '}
          is your account page; the same list is on <a href="/policies">the register</a>.
        </p>
      )}
    </form>
  );
}
