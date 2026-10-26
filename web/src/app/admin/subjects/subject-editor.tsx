'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { parentOptions, retirement, validateSubject, type SubjectRow } from '@/lib/subjects';

/**
 * The subject list, and the three things that can be done to it.
 *
 * Adding and renaming are one form each rather than a modal: the platform is
 * meant to be usable by somebody who does not read code, and a screen where the
 * buttons are visible is the whole point of this page existing.
 *
 * The **code** field is only on the add form. A code is an identifier — what
 * migrations, imports and subject tagging refer to — so it is not editable
 * afterwards, and the screen says so where the reader will look for it. Fixing a
 * typo in what learners read is renaming; changing the code is a different act
 * with a different cost.
 *
 * Retirement is decided by `retirement()`, which reads the counts the server
 * already fetched. When it is refused the button is disabled and the reason is
 * on the row, because a refusal that only appears after a round trip reads as a
 * broken page rather than as a rule.
 */
export function SubjectEditor({ subjects }: { subjects: SubjectRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function send(method: 'POST' | 'PATCH', body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/subjects', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || out?.ok !== true) {
        setMessage(out?.message ?? 'That change was not saved.');
        return false;
      }

      setNotice(done);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setMessage('Could not reach the service that saves subjects.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateSubject({ code, name, parentId });
    if (!checked.ok) {
      setMessage(checked.message);
      setNotice(null);
      return;
    }

    const ok = await send('POST', checked.value, `Added “${checked.value.name}”.`);
    if (ok) {
      setCode('');
      setName('');
      setParentId('');
    }
  }

  async function saveName(subject: SubjectRow) {
    const value = renameValue.trim();
    if (value === subject.name) {
      setRenaming(null);
      return;
    }
    const ok = await send('PATCH', { id: subject.id, name: value }, `Renamed to “${value}”.`);
    if (ok) setRenaming(null);
  }

  async function setStatus(subject: SubjectRow, status: 'active' | 'retired') {
    await send(
      'PATCH',
      { id: subject.id, status },
      status === 'retired'
        ? `“${subject.name}” is retired — readers no longer see it.`
        : `“${subject.name}” is active again.`,
    );
  }

  const options = parentOptions(subjects, null);
  const working = busy || pending;

  return (
    <>
      <section className="card section">
        <h2 style={{ marginTop: 0 }}>Add a subject</h2>
        <p className="muted">
          The code is the identifier: lowercase, dot-separated, and permanent. It is what course tagging
          and any import refer to, so it is never edited afterwards — only the name a learner sees is.
        </p>

        <form onSubmit={add} className="subject-form">
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tajweed"
              maxLength={120}
              required
            />
          </label>
          <label className="field">
            <span>Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="quran.tajweed"
              maxLength={64}
              required
            />
          </label>
          <label className="field">
            <span>Sits under</span>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Nothing — a top-level subject</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn" disabled={working}>
            {working ? 'Saving…' : 'Add subject'}
          </button>
        </form>

        {message && <div className="notice error" role="alert">{message}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
      </section>

      <section className="section">
        <h2>Every subject</h2>
        <ul className="subject-list">
          {subjects.map((subject) => {
            const stop = retirement({ liveUses: subject.liveUses, totalUses: subject.uses });
            const isRetired = subject.status === 'retired';
            const depth = depthOf(subjects, subject.id);

            return (
              <li key={subject.id} className={`subject-row${isRetired ? ' subject-retired' : ''}`}>
                <div className="subject-head" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                  {renaming === subject.id ? (
                    <form
                      className="subject-rename"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveName(subject);
                      }}
                    >
                      <label className="field">
                        <span>New name for “{subject.name}”</span>
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          maxLength={120}
                          autoFocus
                          required
                        />
                      </label>
                      <button type="submit" className="btn tiny" disabled={working}>Save name</button>
                      <button
                        type="button"
                        className="btn ghost tiny"
                        onClick={() => setRenaming(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="subject-name">{subject.name}</span>
                      <code className="subject-code">{subject.code}</code>
                      {isRetired && <span className="badge neutral">Retired</span>}
                      <span className="subject-actions">
                        <button
                          type="button"
                          className="btn ghost tiny"
                          onClick={() => {
                            setRenaming(subject.id);
                            setRenameValue(subject.name);
                          }}
                        >
                          Rename
                        </button>
                        {isRetired ? (
                          <button
                            type="button"
                            className="btn ghost tiny"
                            disabled={working}
                            onClick={() => void setStatus(subject, 'active')}
                          >
                            Bring back
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn ghost tiny"
                            disabled={working || !stop.canRetire}
                            onClick={() => void setStatus(subject, 'retired')}
                          >
                            Retire
                          </button>
                        )}
                      </span>
                    </>
                  )}
                </div>

                <p className="subject-uses muted">
                  {subject.uses === 0
                    ? 'No course is filed under it yet.'
                    : `${subject.uses} course ${subject.uses === 1 ? 'version is' : 'versions are'} filed under it`
                      + (subject.liveUses > 0 ? `, ${subject.liveUses} of them live or in progress.` : '.')}
                  {!isRetired && !stop.canRetire ? ` ${stop.reason}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/**
 * How deep a subject sits, for indentation.
 *
 * Computed here rather than stored: the parent chain is what the database holds,
 * and a depth column would be a second copy of it that can disagree.
 */
function depthOf(subjects: SubjectRow[], id: string): number {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  let depth = 0;
  let cursor = byId.get(id)?.parentId ?? null;
  const seen = new Set<string>([id]);

  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    depth += 1;
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return depth;
}
