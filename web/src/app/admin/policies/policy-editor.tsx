'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {
  approvalProblem,
  canPublish,
  decisionCount,
  describePolicyError,
  draftNote,
  publishRefusal,
  statusNote,
  type PolicyRegister,
  type RegisterDocument,
} from '@/lib/policies';

type Notice = { tone: 'error' | 'done'; text: string };

/**
 * The policy editor.
 *
 * Everything an owner needs to finish a document is on this screen: the draft,
 * the count of questions still marked in it, and the two acts that matter —
 * save a new draft, and put one in force with a date and a written reason.
 *
 * The count is recomputed as the text is typed, because the refusal has to be
 * visible *before* the click. The database enforces the same rule; this only
 * saves the reader from learning it the hard way.
 */
export function PolicyEditor({
  register,
  isOwner,
}: {
  register: PolicyRegister | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [effective, setEffective] = useState(today());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!register) {
    return (
      <div className="notice error" style={{ maxWidth: '48rem', marginTop: '1rem' }}>
        The register could not be read. Nothing has been changed.
      </div>
    );
  }

  const documents = register.documents;

  async function openDocument(doc: RegisterDocument) {
    setNotice(null);
    setBusy(true);
    setReason('');
    setChangeNote('');
    setEffective(today());
    try {
      const supabase = createClient();
      if (doc.draft) {
        const { data, error } = await supabase.rpc('policy_draft', { p_version_id: doc.draft.id });
        if (error) {
          setNotice({ tone: 'error', text: describePolicyError(error.message) });
          return;
        }
        const draft = data as { body?: string } | null;
        setBody(draft?.body ?? '');
      } else {
        // No draft yet: start from the text that is in force, or from nothing.
        const { data } = await supabase.rpc('policy_page', { p_slug: doc.slug });
        const live = data as { body?: string } | null;
        setBody(live?.body ?? '');
      }
      setOpen(doc.slug);
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Nothing was changed.' });
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(doc: RegisterDocument) {
    setNotice(null);
    if (changeNote.trim().length < 3) {
      setNotice({ tone: 'error', text: 'Say what changed, in one line.' });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('save_policy_draft', {
        p_slug: doc.slug,
        p_body: body,
        p_change_note: changeNote,
      });
      if (error) {
        setNotice({ tone: 'error', text: describePolicyError(error.message) });
        return;
      }
      const saved = data as { versionNumber?: number; openDecisions?: number } | null;
      const open_ = Number(saved?.openDecisions ?? decisionCount(body));
      setNotice({
        tone: 'done',
        text: `Saved as version ${saved?.versionNumber ?? '—'}. `
          + (open_ === 0
            ? 'No decisions are open, so it can be put in force.'
            : `${open_} ${open_ === 1 ? 'decision is' : 'decisions are'} still open, so it cannot be published yet.`),
      });
      setOpen(null);
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Nothing was saved.' });
    } finally {
      setBusy(false);
    }
  }

  async function approve(doc: RegisterDocument) {
    setNotice(null);
    const problem = approvalProblem(reason, effective);
    if (problem) {
      setNotice({ tone: 'error', text: problem });
      return;
    }
    if (!doc.draft) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('approve_policy_version', {
        p_version_id: doc.draft.id,
        p_effective: effective,
        p_reason: reason,
      });
      if (error) {
        setNotice({ tone: 'error', text: describePolicyError(error.message) });
        return;
      }
      const approved = data as { versionNumber?: number; replaced?: string | null } | null;
      setNotice({
        tone: 'done',
        text: `Version ${approved?.versionNumber ?? doc.draft.versionNumber} is now in force. `
          + (approved?.replaced
            ? 'The version it replaced is retired, and stays readable in the history.'
            : 'It is the first version of this document to take effect.'),
      });
      setOpen(null);
      setReason('');
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Nothing was published.' });
    } finally {
      setBusy(false);
    }
  }

  const openInEditor = documents.find((doc) => doc.slug === open) ?? null;
  const typedDecisions = decisionCount(body);
  const publishable = canPublish(typedDecisions);

  return (
    <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', maxWidth: '48rem' }}>
      {notice && (
        <div
          className={`notice${notice.tone === 'error' ? ' error' : ''}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}

      <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {documents.map((doc) => (
          <li key={doc.slug} className="card">
            <h2 style={{ margin: '0 0 0.25rem' }}>
              {doc.title}{' '}
              <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
                {doc.live ? `— ${statusNote(doc.live)}` : '— not in force'}
              </span>
            </h2>
            <p className="muted" style={{ margin: '0 0 0.5rem' }}>{doc.summary ?? 'No summary yet.'}</p>
            <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
              {draftNote(doc)}
              {doc.live && doc.live.approvalReason
                ? ` Last approved: “${doc.live.approvalReason}”`
                : ''}
              {doc.live && doc.acceptedAccounts > 0
                ? ` ${doc.acceptedAccounts} ${doc.acceptedAccounts === 1 ? 'account has' : 'accounts have'} agreed to the version in force.`
                : ''}
            </p>
            <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
              {doc.versions.map((version) => (
                <span key={version.id} style={{ marginRight: '0.75rem' }}>
                  v{version.versionNumber} {version.status}
                  {version.effectiveAt ? ` from ${String(version.effectiveAt).slice(0, 10)}` : ''}
                  {version.openDecisions > 0 ? ` · ${version.openDecisions} open` : ''}
                </span>
              ))}
            </p>
            <p style={{ margin: 0, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href={`/policies/${doc.slug}`}>What a visitor sees</Link>
              {isOwner && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => (open === doc.slug ? setOpen(null) : openDocument(doc))}
                  disabled={busy}
                >
                  {open === doc.slug ? 'Close the editor' : doc.draft ? 'Edit draft' : 'Start a new version'}
                </button>
              )}
            </p>

            {isOwner && open === doc.slug && openInEditor && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <label htmlFor={`body-${doc.slug}`}>The text</label>
                <textarea
                  id={`body-${doc.slug}`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={18}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.95rem' }}
                  disabled={busy}
                />

                <p
                  className="muted"
                  style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}
                  role="status"
                >
                  {typedDecisions === 0
                    ? 'No [OWNER DECISION] markers remain. The database will accept this version.'
                    : `${typedDecisions} ${typedDecisions === 1 ? 'marker' : 'markers'} still say [OWNER DECISION]. Answer each one in the text.`}
                </p>

                <label htmlFor={`note-${doc.slug}`}>What changed, in one line</label>
                <input
                  id={`note-${doc.slug}`}
                  type="text"
                  value={changeNote}
                  onChange={(event) => setChangeNote(event.target.value)}
                  placeholder="For example: answered the governing-law question."
                  disabled={busy}
                />
                <p style={{ marginTop: '0.75rem' }}>
                  <button type="button" className="btn" onClick={() => saveDraft(openInEditor)} disabled={busy}>
                    {busy ? 'Saving…' : 'Save as a new draft'}
                  </button>
                </p>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
                  Saving never overwrites a version. It adds the next number, so the text you
                  are replacing stays exactly as it was.
                </p>

                {openInEditor.draft && (
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>
                      Put version {openInEditor.draft.versionNumber} in force
                    </h3>
                    {openInEditor.draft.openDecisions > 0 ? (
                      <div className="notice" style={{ marginBottom: '0.75rem' }}>
                        {publishRefusal(openInEditor.draft.openDecisions)}
                      </div>
                    ) : null}
                    <label htmlFor={`date-${doc.slug}`}>Takes effect on</label>
                    <input
                      id={`date-${doc.slug}`}
                      type="date"
                      value={effective}
                      onChange={(event) => setEffective(event.target.value)}
                      disabled={busy}
                    />
                    <label htmlFor={`reason-${doc.slug}`} style={{ marginTop: '0.5rem' }}>
                      Why it is going in force
                    </label>
                    <textarea
                      id={`reason-${doc.slug}`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={2}
                      style={{ width: '100%', fontFamily: 'inherit' }}
                      disabled={busy}
                    />
                    <p style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => approve(openInEditor)}
                        disabled={busy || !publishable}
                      >
                        {publishable
                          ? `Publish version ${openInEditor.draft.versionNumber}`
                          : 'Answer the open decisions first'}
                      </button>
                    </p>
                    <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
                      Publishing records your name and the reason against this version. From
                      that moment the text cannot be edited, and every account that must agree
                      to it is asked on its own page.
                    </p>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Today, as the date input wants it — the reader's own day, not UTC. */
function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
