'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The application form.
 *
 * Four fields and one honest paragraph. Nothing here is a promise: the button
 * says "Send to the owner", not "become a teacher", and the sentence below it
 * says the same thing again for anybody who skipped the paragraph above.
 *
 * The sample lesson is a link rather than an upload, because a platform with no
 * media pipeline for applicants cannot accept the file — and because a link is
 * something an owner can actually watch before deciding.
 */
export function TeachingApplyForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [headline, setHeadline] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const ready =
    headline.trim().length >= 4 &&
    qualifications.trim().length >= 20 &&
    /^https?:\/\/\S+$/i.test(sampleUrl.trim());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/teaching/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          headline,
          qualifications,
          sampleUrl,
          note: note.trim() === '' ? null : note,
        }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string };
      if (!out.ok) {
        setError(out.message ?? 'That did not send.');
        return;
      }
      setDone('Sent. It is with the owner now, and the answer will be on this page.');
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing was created.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.65rem', maxWidth: '46rem' }}>
      <label htmlFor="teach-headline">What would you teach, in one line?</label>
      <input
        id="teach-headline"
        type="text"
        maxLength={160}
        required
        value={headline}
        onChange={(event) => setHeadline(event.target.value)}
        disabled={busy || pending}
        placeholder="Tajweed and Quran recitation for children"
      />

      <label htmlFor="teach-qualifications">What you know, and who you learned it from</label>
      <textarea
        id="teach-qualifications"
        rows={5}
        maxLength={4000}
        required
        value={qualifications}
        onChange={(event) => setQualifications(event.target.value)}
        disabled={busy || pending}
        placeholder="An ijazah in Hafs from a named teacher, years taught, institutions, languages."
      />
      <p className="muted" style={{ margin: '-0.3rem 0 0' }}>
        In your own words. A teacher’s credentials are checked by a person here, not by a
        dropdown, so write what you would say to another teacher.
      </p>

      <label htmlFor="teach-sample">A sample lesson</label>
      <input
        id="teach-sample"
        type="url"
        maxLength={500}
        required
        value={sampleUrl}
        onChange={(event) => setSampleUrl(event.target.value)}
        disabled={busy || pending}
        placeholder="https://"
      />
      <p className="muted" style={{ margin: '-0.3rem 0 0' }}>
        A link to a lesson you have recorded or streamed. It has to be something the owner can
        watch — a file cannot be uploaded here.
      </p>

      <label htmlFor="teach-note">Anything else (optional)</label>
      <textarea
        id="teach-note"
        rows={3}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={busy || pending}
        placeholder="The hours you can teach, your time zone, the languages you teach in."
      />

      {error && <div className="notice error" role="alert">{error}</div>}
      {done && <div className="notice" role="status">{done}</div>}

      <button type="submit" className="btn" disabled={busy || pending || !ready}>
        {busy ? 'Sending…' : 'Send to the owner'}
      </button>
    </form>
  );
}
