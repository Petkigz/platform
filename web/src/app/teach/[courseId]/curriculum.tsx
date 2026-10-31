'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RESOURCE_TYPES, RESOURCE_TYPE_LABEL, VERSION_STATUS_LABEL,
  type AddResourceAccess, type AuthoredVersion, type ResourceType,
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
  courseId,
  version,
  sourcesByLesson,
  previewsEnabled,
  copyFromVersionId,
}: {
  courseId: string;
  version: AuthoredVersion;
  sourcesByLesson: Record<string, LessonSource[]>;
  previewsEnabled: boolean;
  copyFromVersionId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  const [lessonPreviews, setLessonPreviews] = useState<Record<string, boolean>>({});
  const [resourceAccess, setResourceAccess] = useState<Record<string, AddResourceAccess>>({});
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
      {
        action: 'add_lesson',
        sectionId,
        title,
        isPreview: lessonPreviews[sectionId] === true,
      },
      `lesson-${sectionId}`,
    );
    if (!failed) {
      setLessonTitles({ ...lessonTitles, [sectionId]: '' });
      setLessonPreviews({ ...lessonPreviews, [sectionId]: false });
    }
  }

  async function setPreview(lessonId: string, isPreview: boolean) {
    const failed = await post(
      { action: 'set_preview', lessonId, isPreview },
      `preview-${lessonId}`,
    );
    if (!failed && !isPreview) {
      setResourceAccess({ ...resourceAccess, [lessonId]: 'enrolled' });
    }
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
        access: resourceAccess[lessonId] ?? 'enrolled',
      },
      `resource-${lessonId}`,
    );
    if (!failed) {
      setResourceName({ ...resourceName, [lessonId]: '' });
      setResourceUrl({ ...resourceUrl, [lessonId]: '' });
      setResourceAccess({ ...resourceAccess, [lessonId]: 'enrolled' });
      setOpenLesson(null);
    }
  }

  async function transition(to: 'submitted' | 'draft') {
    await post({ action: 'transition', versionId: version.id, to }, `transition-${to}`);
  }

  async function moveContent(
    contentType: 'section' | 'lesson' | 'resource',
    contentId: string,
    direction: 'up' | 'down',
  ) {
    await post({ action: 'move_content', contentType, contentId, direction }, `move-${contentId}`);
  }

  return (
    <div>
      <div className="outline-h">
        <h3>
          Version {version.versionNumber}{' '}
          <span className="badge neutral">{VERSION_STATUS_LABEL[version.status]}</span>
        </h3>
        <div className="row" style={{ gap: '0.5rem' }}>
          {copyFromVersionId && (
            <button
              type="button"
              className="btn secondary"
              disabled={busy === 'create-version'}
              onClick={() => post(
                { action: 'create_version', sourceVersionId: copyFromVersionId },
                'create-version',
              )}
              title="Copies the curriculum into a new draft. Existing learners stay on this version and current product/price links carry over."
            >
              {busy === 'create-version' ? 'Copying…' : `Create draft from v${version.versionNumber}`}
            </button>
          )}
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

      {!previewsEnabled && (
        <div className="notice warn" style={{ marginBottom: '1rem' }}>
          Free previews are switched off by the platform right now. You can still
          prepare preview lessons; they will not be available to learners until
          an administrator enables Learning previews.
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
        version.sections.map((s, sectionIndex) => (
          <div className="card" key={s.id} style={{ marginBottom: '1rem' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                {s.position}. {s.title}
              </h3>
              {editable && (
                <div className="row" style={{ gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    title={`Move section ${s.title} up`}
                    aria-label={`Move section ${s.title} up`}
                    disabled={busy !== null || sectionIndex === 0}
                    onClick={() => moveContent('section', s.id, 'up')}
                  >↑</button>
                  <button
                    type="button"
                    className="btn ghost"
                    title={`Move section ${s.title} down`}
                    aria-label={`Move section ${s.title} down`}
                    disabled={busy !== null || sectionIndex === version.sections.length - 1}
                    onClick={() => moveContent('section', s.id, 'down')}
                  >↓</button>
                </div>
              )}
            </div>

            {s.lessons.length === 0 ? (
              <p className="empty" style={{ marginBottom: editable ? '0.75rem' : 0 }}>
                No lessons yet.
              </p>
            ) : (
              <ul className="lessons">
                {s.lessons.map((l, lessonIndex) => (
                  <li key={l.id}>
                    <span className="t">
                      {l.position}. {l.title}
                    </span>
                    {editable && (
                      <div className="row" style={{ gap: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn ghost"
                          title={`Move lesson ${l.title} up`}
                          aria-label={`Move lesson ${l.title} up`}
                          disabled={busy !== null || lessonIndex === 0}
                          onClick={() => moveContent('lesson', l.id, 'up')}
                        >↑</button>
                        <button
                          type="button"
                          className="btn ghost"
                          title={`Move lesson ${l.title} down`}
                          aria-label={`Move lesson ${l.title} down`}
                          disabled={busy !== null || lessonIndex === s.lessons.length - 1}
                          onClick={() => moveContent('lesson', l.id, 'down')}
                        >↓</button>
                      </div>
                    )}
                    {editable ? (
                      <label
                        className="muted"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                      >
                        <input
                          type="checkbox"
                          checked={l.isPreview}
                          disabled={busy === `preview-${l.id}`}
                          onChange={(event) => setPreview(l.id, event.target.checked)}
                          aria-label={`Allow free preview for ${l.title}`}
                          style={{ width: 'auto' }}
                        />
                        Free preview
                      </label>
                    ) : l.isPreview && previewsEnabled ? (
                      <span className="badge" style={{ flex: 'none' }}>
                        Free preview
                      </span>
                    ) : null}
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
                    {/* On a draft *and* on a published version, which is the
                        one place a read-only version still wants a door: "what
                        does a learner see" is a question the editor cannot
                        answer, and publishing to find out is not an option. */}
                    <Link
                      href={`/teach/${courseId}/preview/${l.id}`}
                      className="badge neutral"
                      style={{ flex: 'none' }}
                      title={`See how ${l.title} looks to a learner`}
                    >
                      Preview
                    </Link>

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
                        {l.resources.map((r, resourceIndex) => (
                          <li key={r.id} className="row" style={{ justifyContent: 'space-between' }}>
                            <span>
                              {RESOURCE_TYPE_LABEL[r.resourceType]} · {r.resourceName}
                              {r.access === 'public_preview' && (
                                <span className="badge" style={{ marginLeft: '0.4rem' }}>Public preview</span>
                              )}
                            </span>
                            {editable && (
                              <span className="row" style={{ gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  className="btn ghost"
                                  title={`Move ${r.resourceName} up`}
                                  aria-label={`Move ${r.resourceName} up`}
                                  disabled={busy !== null || resourceIndex === 0}
                                  onClick={() => moveContent('resource', r.id, 'up')}
                                >↑</button>
                                <button
                                  type="button"
                                  className="btn ghost"
                                  title={`Move ${r.resourceName} down`}
                                  aria-label={`Move ${r.resourceName} down`}
                                  disabled={busy !== null || resourceIndex === l.resources.length - 1}
                                  onClick={() => moveContent('resource', r.id, 'down')}
                                >↓</button>
                              </span>
                            )}
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
                          {l.isPreview && (
                            <label className="muted" style={{ display: 'grid', gap: '0.25rem', fontSize: '0.85rem' }}>
                              Who can view this content?
                              <select
                                value={resourceAccess[l.id] ?? 'enrolled'}
                                onChange={(ev) => setResourceAccess({
                                  ...resourceAccess,
                                  [l.id]: ev.target.value as AddResourceAccess,
                                })}
                                aria-label={`Access for content in ${l.title}`}
                              >
                                <option value="enrolled">Enrolled learners only</option>
                                <option value="public_preview">Public preview (only while enabled)</option>
                              </select>
                            </label>
                          )}
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
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={lessonPreviews[s.id] ?? false}
                    onChange={(e) => setLessonPreviews({ ...lessonPreviews, [s.id]: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Free preview
                </label>
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
