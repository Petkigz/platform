'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthoredVersion, SubjectOption } from '@/lib/authoring';

/**
 * Choose the subjects a course version is filed under.
 *
 * This is how a course becomes findable. The catalogue has a subject filter and
 * subject badges on every card, and both read this mapping — with nothing here,
 * a course could be published and never appear under any subject, however good
 * it was.
 *
 * Offered only while the version is a draft. D5 freezes subject mapping at
 * publication exactly as it does sections and lessons, so offering this on a
 * published version would be offering something the database will refuse.
 */
export function SubjectPicker({
  version,
  subjects,
  initial,
}: {
  version: AuthoredVersion;
  subjects: SubjectOption[];
  initial: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editable = version.status === 'draft';
  const topLevel = subjects.filter((s) => s.isTopLevel);
  const subdivisions = subjects.filter((s) => !s.isTopLevel);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    setMessage(null);
  }

  async function save() {
    setMessage(null);
    setError(null);

    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'set_subjects', versionId: version.id, codes: selected }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      value?: { count: number };
    };

    if (!res.ok || json.ok !== true) {
      setError(json.message ?? 'Could not save the subjects.');
      return;
    }

    setMessage(`Filed under ${json.value?.count ?? selected.length} subject${
      (json.value?.count ?? selected.length) === 1 ? '' : 's'
    }.`);
    startTransition(() => router.refresh());
  }

  const dirty =
    selected.length !== initial.length ||
    selected.some((c) => !initial.includes(c));

  return (
    <div className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Subjects
      </p>

      {!editable ? (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {selected.length === 0
              ? 'This version has no subjects, and it is published — so it cannot be filed under any. Cut a new version to fix that.'
              : `Filed under ${selected.length} subject${selected.length === 1 ? '' : 's'}. Locked, because this version is published.`}
          </p>
          {selected.length > 0 && (
            <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
              {selected.map((code) => (
                <span className="badge neutral" key={code}>
                  {subjects.find((s) => s.code === code)?.name ?? code}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            This is how learners find the course. Pick at least one — an
            untagged course never appears under any subject.
          </p>

          {([
            [null, topLevel],
            ['Subdivisions', subdivisions],
          ] as const).map(([heading, group]) =>
            group.length === 0 ? null : (
              <div key={heading ?? 'top'}>
                {heading && <p className="eyebrow" style={{ margin: '0.25rem 0' }}>{heading}</p>}
                <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                  {group.map((s) => (
                    <label
                      key={s.code}
                      className="row"
                      style={{ gap: '0.3rem', fontSize: '0.9rem' }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(s.code)}
                        onChange={() => toggle(s.code)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            ),
          )}

          <div>
            <button
              type="button"
              className="btn"
              disabled={pending || !dirty || selected.length === 0}
              onClick={save}
            >
              {pending ? 'Saving…' : 'Save subjects'}
            </button>
          </div>
        </>
      )}

      {message && <div className="notice info" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </div>
  );
}
