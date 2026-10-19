'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  RESOURCE_TYPES, RESOURCE_TYPE_LABEL, VERSION_STATUS_LABEL,
  type AuthoredVersion, type ResourceType,
} from '@/lib/authoring';
import { SourceForm } from './source-form';
import type { LessonSource } from '@/lib/provenance';

/**
 * The curriculum editor.
 *
 * The rule that shapes this whole component is D5: publishing freezes the
 * version subtree. So a published version renders read-only with an
 * explanation, not with disabled controls — a greyed-out button invites you
 * to find the thing that un-greys it, and here there is nothing. You make a
 * new version instead.
 */
export function Curriculum({
  version,
  sourcesByLesson,
}: {
  version: AuthoredVersion;
  sourcesByLesson: Record<string, LessonSource[]>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState<Record<string, string>>({});
  const [resourceUrl, setResourceUrl] = useState<Record<string, string>>({});
  const [resourceType, setResourceType] = useState<Record<string, ResourceType>>({});
  const [, startTransition] = useTransition();

  const editable = version.status === 'draft';
  const canSubmit = editable && version.lessonCount > 0;

  async function post(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);

    const res = await fetch('/api/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as { ok: boolean; message?: string };

    setBusy(null);
    if (!json.ok) {
      setError(json.message ?? 'That did not work.');
      return true;
    }
    startTransition(() => router.refresh());
    return false;
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    const failed = await post(
      { action: 'add_section', versionId: version.id, title: sectionTitle },
      'section',
    );
    if (!failed) setSectionTitle('');
  }

  async function addLesson(e: React.FormEvent, sectionId: string) {
    e.preventDefault();
    const title = lessonTitles[sectionId] ?? '';
    const failed = await post(
      { action: 'add_lesson', sectionId, title },
      `lesson-${sectionId}`,
    );
    if (!failed) setLessonTitles({ ...lessonTitles, [sectionId]: '' });
  }

  async function addResource(e: React.FormEvent, lessonId: string) {
    e.preventDefault();
    const failed = await post(
      {
        action: 'add_resource',
        lessonId,
        resourceType: resourceType[lessonId] ?? 'video',
        url: resourceUrl[lessonId] ?? '',
        name: resourceName[lessonId] ?? '',
      },
      `resource-${lessonId}`,
    );
    if (!failed) {
      setResourceName({ ...resourceName, [lessonId]: '' });
      setResourceUrl({ ...resourceUrl, [lessonId]: '' });
      setOpenLesson(null);
    }
  }

  async function transition(to: 'submitted' | 'draft') {
    await post({ action: 'transition', versionId: version.id, to }, `transition-${to}`);
  }

  return (
    <div>
      <div className="outline-h">
        <h3>
          Version {version.versionNumber}{' '}
          <span className="badge neutral">{VERSION_STATUS_LABEL[version.status]}</span>
        </h3>
        <div className="row" style={{ gap: '0.5rem' }}>
          {version.status === 'draft' && (
            <button
              type="button"
              className="btn"
              disabled={!canSubmit || busy === 'transition-submitted'}
              onClick={() => transition('submitted')}
              title={
                canSubmit ? undefined : 'A version needs at least one lesson to be submitted.'
              }
            >
              {busy === 'transition-submitted' ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
          {version.status === 'submitted' && (
            <button
              type="button"
              className="btn secondary"
              disabled={busy === 'transition-draft'}
              onClick={() => transition('draft')}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {!editable && (
        <div className="notice" style={{ marginBottom: '1rem' }}>
          This version is {VERSION_STATUS_LABEL[version.status].toLowerCase()} and can no
          longer be edited. Editing a published course would change what people
          already paid for, so changes go into a new version instead.
        </div>
      )}

      {error && (
        <div className="notice error" style={{ marginBottom: '1rem' }} role="alert">
          {error}
        </div>
      )}

      {version.sections.length === 0 ? (
        <div className="empty">No sections yet.</div>
      ) : (
        version.sections.map((s) => (
          <div className="card" key={s.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>
              {s.position}. {s.title}
            </h3>

            {s.lessons.length === 0 ? (
              <p className="empty" style={{ marginBottom: editable ? '0.75rem' : 0 }}>
                No lessons yet.
              </p>
            ) : (
              <ul className="lessons">
                {s.lessons.map((l) => (
                  <li key={l.id}>
                    <span className="t">
                      {l.position}. {l.title}
                    </span>
                    {l.isPreview && (
                      <span className="badge" style={{ flex: 'none' }}>
                        Free preview
                      </span>
                    )}
                    {l.resources.length > 0 && (
                      <span className="badge neutral" style={{ flex: 'none' }}>
                        {l.resources.length} item{l.resources.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {editable && l.resources.length === 0 && (
                      <span
                        className="badge neutral"
                        style={{ flex: 'none', borderColor: 'var(--amber, #b45309)' }}
                      >
                        No content yet
                      </span>
                    )}

                    {l.resources.length > 0 && (
                      <ul
                        className="muted"
                        style={{
                          listStyle: 'none',
                          margin: '0.35rem 0 0',
                          padding: 0,
                          fontSize: '0.85rem',
                          display: 'grid',
                          gap: '0.2rem',
                        }}
                      >
                        {l.resources.map((r) => (
                          <li key={r.id}>
                            {RESOURCE_TYPE_LABEL[r.resourceType]} · {r.resourceName}
                          </li>
                        ))}
                      </ul>
                    )}

                    {editable && (
                      <SourceForm courseVersionId={version.id} lessonId={l.id} lessonTitle={l.title} sources={sourcesByLesson[l.id] ?? []} />
                    )}

                    {editable &&
                      (openLesson === l.id ? (
                        <form
                          onSubmit={(ev) => addResource(ev, l.id)}
                          style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}
                        >
                          <div className="row">
                            <select
                              value={resourceType[l.id] ?? 'video'}
                              onChange={(ev) =>
                                setResourceType({
                                  ...resourceType,
                                  [l.id]: ev.target.value as ResourceType,
                                })
                              }
                              aria-label={`Content type for ${l.title}`}
                            >
                              {RESOURCE_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {RESOURCE_TYPE_LABEL[t]}
                                </option>
                              ))}
                            </select>
                            <input
                              value={resourceName[l.id] ?? ''}
                              onChange={(ev) =>
                                setResourceName({ ...resourceName, [l.id]: ev.target.value })
                              }
                              placeholder="Name learners will see"
                              aria-label={`Name for content in ${l.title}`}
                              maxLength={200}
                              style={{ flex: 1 }}
                            />
                          </div>
                          <div className="row">
                            <input
                              value={resourceUrl[l.id] ?? ''}
                              onChange={(ev) =>
                                setResourceUrl({ ...resourceUrl, [l.id]: ev.target.value })
                              }
                              placeholder="https://"
                              aria-label={`URL for content in ${l.title}`}
                              type="url"
                              style={{ flex: 1 }}
                            />
                            <button
                              type="submit"
                              className="btn secondary"
                              disabled={busy === `resource-${l.id}`}
                            >
                              {busy === `resource-${l.id}` ? 'Adding…' : 'Add content'}
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => setOpenLesson(null)}
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                            Uploads into our own storage are not wired yet, so this
                            takes a link. It must be https.
                          </p>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ marginTop: '0.4rem' }}
                          onClick={() => setOpenLesson(l.id)}
                        >
                          Add content
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            )}

            {editable && (
              <form onSubmit={(e) => addLesson(e, s.id)} className="row" style={{ marginTop: '0.75rem' }}>
                <input
                  value={lessonTitles[s.id] ?? ''}
                  onChange={(e) => setLessonTitles({ ...lessonTitles, [s.id]: e.target.value })}
                  placeholder="Lesson title"
                  aria-label={`New lesson in ${s.title}`}
                  maxLength={120}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn secondary"
                  disabled={busy === `lesson-${s.id}`}
                >
                  {busy === `lesson-${s.id}` ? 'Adding…' : 'Add lesson'}
                </button>
              </form>
            )}
          </div>
        ))
      )}

      {editable && (
        <form onSubmit={addSection} className="row" style={{ marginTop: '1rem' }}>
          <input
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="Section title"
            aria-label="New section title"
            maxLength={120}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn" disabled={busy === 'section'}>
            {busy === 'section' ? 'Adding…' : 'Add section'}
          </button>
        </form>
      )}

      {canSubmit === false && editable && version.lessonCount === 0 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          A version needs at least one lesson before it can be submitted.
        </p>
      )}
    </div>
  );
}
