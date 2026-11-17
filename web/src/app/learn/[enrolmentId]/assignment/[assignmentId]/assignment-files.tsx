'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  COURSEWORK_ACCEPT,
  COURSEWORK_MAX_BYTES,
  COURSEWORK_MAX_FILES,
  courseworkFileHref,
  confirmCourseworkFile,
  describeFileKind,
  describeFileSize,
  parseCourseworkFilePage,
  parseFirstCourseworkFilePage,
  appendCourseworkFilePage,
  removeCourseworkFile,
  uploadCourseworkFile,
  validateCourseworkFile,
  type CourseworkFile,
  type CourseworkFileCode,
  type UploadPhase,
} from '@/lib/coursework';
import { fill, formatNumber, formatPercent } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/**
 * Every sentence this component says, handed in by the page. Same reason as
 * `AssignmentWords`: a browser is not sent these.
 */
export type FileWords = {
  files: string;
  countUnknown: string;
  /** `{count}` */
  attached: string;
  /** `{count}` */
  notAttached: string;
  listUnknown: string;
  unnamed: string;
  checkAgain: string;
  resend: string;
  remove: string;
  /** `{shown}`, `{total}` */
  showing: string;
  showMore: string;
  /** `{size}` */
  hint: string;
  /** `{count}` */
  hintRemaining: string;
  pendingExplain: string;
  resendLabel: string;
  none: string;
  phaseReading: string;
  phaseAsking: string;
  phaseSending: string;
  phaseChecking: string;
  phaseDone: string;
  kindImage: string;
  kindAudio: string;
  kindOther: string;
  statusPending: string;
  statusHeld: string;
  statusUnavailable: string;
  errNoName: string;
  errEmpty: string;
  /** `{size}`, `{limit}` */
  errTooBig: string;
  errKind: string;
  /** `{count}` */
  errTooMany: string;
  errDraft: string;
  errUnreadable: string;
  errUncertain: string;
  errListAfterAttach: string;
  errListChanged: string;
  /** `{size}` */
  msgAttached: string;
  msgConfirmed: string;
  msgRemoved: string;
  errRemove: string;
  errRemoveList: string;
  /** What the server said no to. The first three are the page's own. */
  errSignIn: string;
  errNotAllowed: string;
  errNotFound: string;
  errNotDraft: string;
  errDifferent: string;
};

/**
 * The files on one hand-in.
 *
 * A photograph of a page of handwriting is the most likely thing a learner has to
 * give a teacher who is not in the room, and until now there was nowhere to put
 * one: the assignment page said files would appear "once private upload is
 * connected", and the teacher's queue counted a number nobody could produce.
 *
 * The upload is three steps and each one is named while it happens, because
 * hashing then transferring a page on a phone connection takes long enough that a
 * silent button reads as a broken one.
 *
 * Nothing is removed after the work is submitted — `remove_assignment_asset()` is
 * draft-only by design, so a marked submission cannot have its evidence taken out
 * from under it — and the button says so rather than failing after a click.
 */
export function AssignmentFiles({
  submissionId,
  files: initialFiles,
  locked,
  ensureDraft,
  locale,
  words,
}: {
  /** Empty until the learner has a draft; the first upload creates one. */
  submissionId: string;
  files: unknown;
  /** True once the work is submitted or the task is closed. */
  locked: boolean;
  /** Saves a draft and returns its id, so a file can be attached to something. */
  ensureDraft: () => Promise<string | null>;
  /** The language the words are in, for numbers. */
  locale: LocaleCode;
  words: FileWords;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const retryInputRef = useRef<HTMLInputElement | null>(null);
  const retryAssetRef = useRef<string | null>(null);
  const [filePage, setFilePage] = useState(() => parseFirstCourseworkFilePage(initialFiles));
  const files = filePage?.files ?? null;
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setFilePage(parseFirstCourseworkFilePage(initialFiles)); }, [initialFiles]);
  const attachedCount = filePage?.attachedCount ?? null;
  const pendingCount = filePage?.pendingCount ?? null;
  const remaining = attachedCount === null ? null : Math.max(0, COURSEWORK_MAX_FILES - attachedCount);
  const num = (value: number) => formatNumber(locale, value);

  // Why something did not go through, in the reader's language. The English
  // sentence that came with the code is not printed. Any code this page does
  // not know is treated as the outcome not being known, which is the careful
  // reading: check before sending anything again.
  const sentenceFor = (code: CourseworkFileCode, size: number): string => {
    switch (code) {
      case 'no_name': return words.errNoName;
      case 'empty': return words.errEmpty;
      case 'too_big':
        return fill(words.errTooBig, { size: describeFileSize(size), limit: describeFileSize(COURSEWORK_MAX_BYTES) });
      case 'wrong_kind': return words.errKind;
      case 'too_many': return fill(words.errTooMany, { count: num(COURSEWORK_MAX_FILES) });
      case 'unreadable': return words.errUnreadable;
      // The server's own reasons. Each is a known refusal: nothing was
      // registered, so the learner is told what is so and not to go and check.
      case 'not_signed_in': return words.errSignIn;
      case 'not_allowed': return words.errNotAllowed;
      case 'not_found': return words.errNotFound;
      case 'not_draft': return words.errNotDraft;
      case 'list_changed': return words.errListChanged;
      case 'different_file': return words.errDifferent;
      case 'remove_uncertain': return words.errRemove;
      default: return words.errUncertain;
    }
  };
  const phaseWords: Record<UploadPhase, string> = {
    hashing: words.phaseReading,
    registering: words.phaseAsking,
    uploading: words.phaseSending,
    confirming: words.phaseChecking,
    done: words.phaseDone,
  };
  /** What one file's line says: its kind, its size, and whether it arrived. */
  const describe = (file: CourseworkFile): string => {
    const kind = describeFileKind(file.mimeType);
    const parts = [
      kind === 'PDF' ? 'PDF' : kind === 'image' ? words.kindImage : kind === 'audio' ? words.kindAudio : words.kindOther,
      describeFileSize(file.byteSize),
    ];
    if (file.status === 'pending') parts.push(words.statusPending);
    else if (file.status === 'quarantined') parts.push(words.statusHeld);
    else if (file.status !== 'available') parts.push(words.statusUnavailable);
    return parts.join(' · ');
  };

  async function fetchPage(target: string, after: string | null = null) {
    const query = new URLSearchParams({submission: target, page: '1'});
    if (after) query.set('after', after);
    const response = await fetch(`/api/assignments?${query}`, {cache:'no-store'}).catch(() => null);
    if (!response?.ok) return null;
    const body = await response.json().catch(() => null) as {ok?: unknown; page?: unknown} | null;
    return body?.ok === true ? (after ? parseCourseworkFilePage(body.page) : parseFirstCourseworkFilePage(body.page)) : null;
  }

  async function loadMore() {
    if (!filePage?.nextCursor || !submissionId) return;
    setBusy(true); setError('');
    try {
      const next=await fetchPage(submissionId,filePage.nextCursor);
      const combined=next && appendCourseworkFilePage(filePage,next);
      if (!combined) setError(words.errListChanged);
      else setFilePage(combined);
    } finally { setBusy(false); }
  }

  async function choose(chosen: File | null, retryAssetId?: string) {
    if (!chosen) return;
    setError('');
    setNotice('');

    // Refused before the checksum, with the reason and the size — a learner on
    // metered data should not learn the cap after sending the file.
    const check = validateCourseworkFile(
      { name: chosen.name, size: chosen.size, type: chosen.type },
      attachedCount ?? 0,
    );
    if (!check.ok) {
      setError(sentenceFor(check.code, chosen.size));
      if (inputRef.current) inputRef.current.value = '';
      if (retryInputRef.current) retryInputRef.current.value = '';
      return;
    }

    setBusy(true);
    try {
      const target = submissionId || (retryAssetId ? null : await ensureDraft());
      if (!target) {
        setError(words.errDraft);
        return;
      }

      const outcome = await uploadCourseworkFile(chosen, {
        submissionId: target,
        retryAssetId,
        onProgress: (next, value) => {
          setPhase(next);
          setPercent(value);
        },
      });

      if (!outcome.ok) {
        setError(sentenceFor(outcome.code, chosen.size));
        router.refresh();
        return;
      }

      // Read back from the database rather than appended by hand: the server's
      // list is the one that will still be there after a refresh.
      const refreshed = await fetchPage(target);
      setFilePage(refreshed);
      if (!refreshed) setError(words.errListAfterAttach);
      setNotice(fill(words.msgAttached, { size: describeFileSize(chosen.size) }));
      router.refresh();
    } catch {
      setError(words.errUncertain);
      router.refresh();
    } finally {
      setBusy(false);
      setPhase(null);
      setPercent(0);
      if (inputRef.current) inputRef.current.value = '';
      if (retryInputRef.current) retryInputRef.current.value = '';
    }
  }

  async function retryConfirmation(assetId: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await confirmCourseworkFile(assetId);
      if (result.ok) setNotice(words.msgConfirmed);
      else setError(sentenceFor(result.code, 0));
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(assetId: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await removeCourseworkFile(submissionId, assetId);
      if (result.ok) {
        const refreshed = await fetchPage(submissionId);
        setFilePage(refreshed);
        setNotice(words.msgRemoved);
        if (!refreshed) setError(words.errRemoveList);
      } else {
        setError(sentenceFor(result.code, 0));
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{words.files}</h3>
        <span className="muted" style={{ fontSize: '.85rem' }}>
          {attachedCount === null
            ? words.countUnknown
            : `${fill(words.attached, { count: num(attachedCount) })}${pendingCount ? ` · ${fill(words.notAttached, { count: num(pendingCount) })}` : ''}`}
        </span>
      </div>

      {files === null && <p className="notice warn">{words.listUnknown}</p>}
      {files !== null && files.length > 0 && (
        <ul className="lessons">
          {files.map((file) => (
            <li key={file.assetId}>
              <span className="t">
                {file.attachmentId ? (
                  <a href={courseworkFileHref(file.assetId)} target="_blank" rel="noreferrer">
                    <bdi>{file.name ?? words.unnamed}</bdi>
                  </a>
                ) : (
                  <bdi>{file.name ?? words.unnamed}</bdi>
                )}
                <span className="muted"> · {describe(file)}</span>
              </span>
              {!locked && file.status === 'pending' && (
                <div className="row">
                  <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => void retryConfirmation(file.assetId)}>
                    {words.checkAgain}
                  </button>
                  <button type="button" className="btn ghost tiny" disabled={busy} onClick={() => { retryAssetRef.current = file.assetId; retryInputRef.current?.click(); }}>
                    {words.resend}
                  </button>
                </div>
              )}
              {!locked && file.status === 'available' && (
                <button
                  type="button"
                  className="btn ghost tiny"
                  disabled={busy}
                  onClick={() => void remove(file.assetId)}
                >
                  {words.remove}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {filePage?.nextCursor && <div>
        <p className="muted">
          {fill(words.showing, {
            shown: num(filePage.files.length),
            total: num(filePage.attachedCount + filePage.pendingCount),
          })}
        </p>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => void loadMore()}>{words.showMore}</button>
      </div>}

      {!locked && (
        <div style={{ display: 'grid', gap: '.4rem' }}>
          <label htmlFor="assignment-file" className="muted" style={{ fontSize: '.85rem' }}>
            {fill(words.hint, { size: describeFileSize(COURSEWORK_MAX_BYTES) })}{' '}
            {remaining === null ? words.countUnknown : fill(words.hintRemaining, { count: num(remaining) })}
          </label>
          <p className="muted">{words.pendingExplain}</p>
          <input ref={retryInputRef} type="file" accept={COURSEWORK_ACCEPT} hidden aria-label={words.resendLabel} disabled={busy}
            onChange={(event) => { const id = retryAssetRef.current; retryAssetRef.current = null; if (id) void choose(event.target.files?.[0] ?? null, id); }} />
          <input
            ref={inputRef}
            id="assignment-file"
            type="file"
            accept={COURSEWORK_ACCEPT}
            disabled={busy || (remaining !== null && remaining <= 0)}
            onChange={(event) => void choose(event.target.files?.[0] ?? null)}
          />
          {busy && phase && (
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
              {phaseWords[phase]}
              {phase === 'hashing' || phase === 'uploading' ? ` ${formatPercent(locale, percent)}` : ''}
            </p>
          )}
        </div>
      )}

      {locked && files !== null && files.length === 0 && !filePage?.nextCursor && (
        <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
          {words.none}
        </p>
      )}

      {error && <p className="notice error" style={{ margin: 0 }}>{error}</p>}
      {notice && <p className="notice" style={{ margin: 0 }}>{notice}</p>}
    </div>
  );
}
