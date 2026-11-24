'use client';

import { useState } from 'react';

import type { TranslateOutcome, TranslateWords } from '@/lib/translate';

/**
 * Translate, under something somebody wrote.
 *
 * The original stays where it is. The translation is drawn under it, as
 * text, with a line that says a machine made it: it is not the writer's
 * sentence and it is not the platform's. Pressing again hides it.
 *
 * `words` is null when translation is off, and then nothing is drawn. The
 * page decides that on the server, so a reader is never shown a button that
 * can only fail.
 */
export function TranslateButton({ text, words }: { text: string; words: TranslateWords | null }) {
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);
  const [result, setResult] = useState<{ text: string; same: boolean; to: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  if (!words || !text.trim()) return null;
  const said = words;

  async function press() {
    setFailed(null);
    if (result) {
      setShown((now) => !now);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; text?: unknown; same?: unknown; to?: unknown; code?: string }
        | null;
      if (!res.ok || json?.ok !== true || typeof json.text !== 'string') {
        const code = (json?.code ?? 'refused') as TranslateOutcome;
        setFailed(said.reasons[code] ?? said.reasons.refused);
        return;
      }
      setResult({ text: json.text, same: json.same === true, to: typeof json.to === 'string' ? json.to : '' });
      setShown(true);
    } catch {
      setFailed(said.reasons.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="translate">
      <button type="button" className="translate-press" onClick={press} disabled={busy} aria-expanded={shown}>
        {busy ? said.working : shown ? said.hide : said.translate}
      </button>
      {failed && <p className="translate-note" role="alert">{failed}</p>}
      {shown && result && (
        result.same ? (
          <p className="translate-note" role="status">{said.same}</p>
        ) : (
          <div className="translate-result" role="status">
            <p className="translate-note">{said.by}</p>
            <p className="translate-text" lang={result.to || undefined} dir="auto">{result.text}</p>
          </div>
        )
      )}
    </div>
  );
}
