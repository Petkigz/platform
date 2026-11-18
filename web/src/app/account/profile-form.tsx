'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_PROFILE_SENTENCES,
  ACCOUNT_ZONE_MAX,
  accountProfileProblem,
  type AccountProfileProblem,
} from '@/lib/account';

/**
 * The profile card on `/account`.
 *
 * **The words are handed in.** The account page is drawn on the server in the
 * reader's language and passes this form its sentences; nothing here asks the
 * catalogue for one, so the account page's sentences stay out of the script
 * every page carries. Called without `words`, the form is English.
 *
 * **A refusal is said in the reader's language, by its name.** The route
 * answers with a code (`lib/account.ts`); the form says its own sentence for
 * each, and "could not be saved" for an answer it does not recognise. The
 * same check runs here before anything is sent, so a typing mistake is named
 * without a request. The server's own sentence is not shown.
 *
 * **Saving twice is harmless.** The save sets three fields to what is typed,
 * so "try again" is honest after an answer that never arrived.
 */
export type ProfileFormWords = {
  name: string;
  language: string;
  languageNote: string;
  zone: string;
  save: string;
  saving: string;
  saved: string;
  unreachable: string;
  /** `name_long` carries `{count}`, and so does `zone_long`. */
  problems: Record<AccountProfileProblem, string>;
};

const ENGLISH: ProfileFormWords = {
  name: 'Display name',
  language: 'Preferred language code',
  languageNote:
    'This is kept with your profile, and nothing reads it yet. The language of these pages is chosen on the Language page and is kept on this browser.',
  zone: 'Time zone',
  save: 'Save profile',
  saving: 'Saving…',
  saved: 'Your profile has been updated.',
  unreachable: 'Could not reach the server. Check your connection and try again.',
  problems: {
    ...ACCOUNT_PROFILE_SENTENCES,
    name_long: 'Keep your display name to {count} characters or fewer.',
    zone_long: 'Keep the time zone to {count} characters or fewer.',
  },
};

const isProblem = (value: unknown): value is AccountProfileProblem =>
  typeof value === 'string' && Object.hasOwn(ACCOUNT_PROFILE_SENTENCES, value);

export function ProfileForm({
  initial,
  words,
  maxima,
}: {
  initial: { displayName: string; preferredLanguage: string; timezone: string | null };
  words?: ProfileFormWords;
  /** The two limits, written in the reader's digits by the page. */
  maxima?: { name: string; zone: string };
}) {
  const say = words ?? ENGLISH;
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState(initial.preferredLanguage);
  const [timezone, setTimezone] = useState(initial.timezone ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function sentenceFor(problem: AccountProfileProblem): string {
    const count = problem === 'name_long'
      ? (maxima?.name ?? String(ACCOUNT_NAME_MAX))
      : (maxima?.zone ?? String(ACCOUNT_ZONE_MAX));
    return say.problems[problem].replace('{count}', count);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const problem = accountProfileProblem({ displayName, preferredLanguage, timezone });
    if (problem) {
      setError(sentenceFor(problem));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, preferredLanguage, timezone }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; code?: unknown } | null;
      if (!response.ok || result?.ok !== true) {
        setError(sentenceFor(isProblem(result?.code) ? result.code : 'failed'));
        return;
      }
      setMessage(say.saved);
      startTransition(() => router.refresh());
    } catch {
      setError(say.unreachable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card"
      onSubmit={submit}
      noValidate
      style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}
    >
      <label htmlFor="account-display-name">{say.name}</label>
      <input
        id="account-display-name"
        autoComplete="name"
        dir="auto"
        maxLength={ACCOUNT_NAME_MAX}
        required
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        disabled={busy}
      />
      <label htmlFor="account-language">{say.language}</label>
      {/* A language code and a zone name are Latin letters whatever the page is. */}
      <input
        id="account-language"
        dir="ltr"
        placeholder="en"
        maxLength={5}
        required
        aria-describedby="account-language-note"
        value={preferredLanguage}
        onChange={(event) => setPreferredLanguage(event.target.value)}
        disabled={busy}
      />
      <p id="account-language-note" className="muted" style={{ margin: '-0.3rem 0 0' }}>
        {say.languageNote}
      </p>
      <label htmlFor="account-timezone">{say.zone}</label>
      <input
        id="account-timezone"
        dir="ltr"
        autoComplete="off"
        placeholder="Africa/Kampala"
        maxLength={ACCOUNT_ZONE_MAX}
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        disabled={busy}
      />
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? say.saving : say.save}
      </button>
    </form>
  );
}
