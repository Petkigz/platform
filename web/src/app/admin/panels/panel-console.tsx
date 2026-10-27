'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {
  describePanelError,
  outcomeProblem,
  panelMemberRole,
  panelStatusLabel,
  quorumSentence,
  tallySentence,
  versionLabel,
  type Panel,
  type PanelRegister,
} from '@/lib/panels';

type Notice = { tone: 'error' | 'done'; text: string };

/**
 * The console.
 *
 * Each control is the one the database will accept, and each refusal is shown as
 * a sentence rather than as a constraint name. Nothing here decides a majority:
 * the tally is on the case, and the outcome is the chair's to record — refused
 * only when the votes contradict it.
 */
export function PanelConsole({
  register,
  isOwner,
  subjects,
}: {
  register: PanelRegister | null;
  isOwner: boolean;
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({
    name: '', description: '', subject: '', quorum: '3',
  });

  if (!register) {
    return (
      <div className="notice error" style={{ maxWidth: '48rem', marginTop: '1rem' }}>
        The panel register could not be read. Nothing has been changed.
      </div>
    );
  }

  async function run(
    action: () => Promise<{ error: { message: string } | null }>,
    done: string,
  ) {
    setNotice(null);
    setBusy(true);
    try {
      const { error } = await action();
      if (error) {
        setNotice({ tone: 'error', text: describePanelError(error.message) });
        return false;
      }
      setNotice({ tone: 'done', text: done });
      router.refresh();
      return true;
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the server. Nothing was changed.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openPanel() {
    const quorum = Number(draft.quorum);
    if (!Number.isInteger(quorum) || quorum < 1) {
      setNotice({ tone: 'error', text: 'A quorum is a whole number of people, at least one.' });
      return;
    }
    const ok = await run(
      async () => {
        const supabase = createClient();
        const { error } = await supabase.rpc('open_panel', {
          p_name: draft.name,
          p_description: draft.description.trim() ? draft.description : null,
          p_subject_area_id: draft.subject || null,
          p_quorum_size: quorum,
        });
        return { error };
      },
      'The panel exists, on paper. Seat people and convene it.',
    );
    if (ok) setDraft({ name: '', description: '', subject: '', quorum: '3' });
  }

  return (
    <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', maxWidth: '52rem' }}>
      {notice && (
        <div className={`notice${notice.tone === 'error' ? ' error' : ''}`}
             role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      {isOwner && (
        <section className="card" style={{ display: 'grid', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Open a panel</h2>
          <p className="muted" style={{ margin: 0 }}>
            A panel covers one subject area, or every subject if none is chosen. The quorum is
            the number of members who must vote before a decision can be recorded — your number,
            not a default.
          </p>
          <label htmlFor="panel-name">Name</label>
          <input
            id="panel-name"
            type="text"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Fiqh judgements panel"
            disabled={busy}
          />
          <label htmlFor="panel-description">What it decides, in a sentence</label>
          <input
            id="panel-description"
            type="text"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            disabled={busy}
          />
          <label htmlFor="panel-subject">Subject area</label>
          <select
            id="panel-subject"
            value={draft.subject}
            onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            disabled={busy}
          >
            <option value="">Every subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <label htmlFor="panel-quorum">Quorum — members who must vote</label>
          <input
            id="panel-quorum"
            type="number"
            min={1}
            max={25}
            value={draft.quorum}
            onChange={(event) => setDraft({ ...draft, quorum: event.target.value })}
            disabled={busy}
          />
          <p style={{ margin: 0 }}>
            <button type="button" className="btn" onClick={openPanel} disabled={busy}>
              {busy ? 'Working…' : 'Open the panel'}
            </button>
          </p>
        </section>
      )}

      {register.panels.length === 0 ? (
        <p className="muted">
          No panel has been opened. Nothing is waiting on one: publication does not require a
          panel decision while <code>governance.panel_required</code> is off.
        </p>
      ) : (
        register.panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            isOwner={isOwner}
            candidates={register.candidates}
            awaiting={register.awaiting}
            busy={busy}
            run={run}
          />
        ))
      )}
    </div>
  );
}

function PanelCard({
  panel,
  isOwner,
  candidates,
  awaiting,
  busy,
  run,
}: {
  panel: Panel;
  isOwner: boolean;
  candidates: PanelRegister['candidates'];
  awaiting: PanelRegister['awaiting'];
  busy: boolean;
  run: (action: () => Promise<{ error: { message: string } | null }>, done: string) => Promise<boolean>;
}) {
  const [seat, setSeat] = useState('');
  const [seatRole, setSeatRole] = useState('member');
  const [removal, setRemoval] = useState<{ id: string; reason: string } | null>(null);
  const [versionId, setVersionId] = useState('');
  const [decision, setDecision] = useState<{ id: string; outcome: string; summary: string } | null>(null);

  const seated = new Set(panel.members.filter((m) => m.status === 'active').map((m) => m.reviewerProfileId));
  const available = awaiting.filter((row) => !row.hasOpenCase);
  const openCases = panel.cases.filter((c) => c.status === 'open' || c.status === 'deliberating');

  return (
    <section className="card" style={{ display: 'grid', gap: '0.5rem' }}>
      <h2 style={{ margin: 0 }}>
        {panel.name}{' '}
        <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>
          — {panelStatusLabel(panel.status)} · quorum {panel.quorum}
          {panel.subject ? ` · ${panel.subject}` : ' · every subject'}
        </span>
      </h2>
      {panel.description && <p className="muted" style={{ margin: 0 }}>{panel.description}</p>}

      <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
        {panel.activeMembers} seated
        {panel.activeMembers < panel.quorum ? ' — fewer than the quorum' : ''}
      </p>

      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {panel.members.map((member) => (
          <li key={member.id} style={{ marginBottom: '0.25rem' }}>
            {member.name}{' '}
            <span className="muted">
              · {panelMemberRole(member.memberRole)} · {member.status === 'active' ? 'seated' : member.status}
            </span>{' '}
            {isOwner && member.status === 'active' && (
              removal?.id === member.id ? (
                <span style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                  <label htmlFor={`remove-${member.id}`}>Reason</label>
                  <input
                    id={`remove-${member.id}`}
                    type="text"
                    value={removal.reason}
                    onChange={(event) => setRemoval({ id: member.id, reason: event.target.value })}
                    disabled={busy}
                    style={{ width: '14rem' }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await run(async () => {
                        const supabase = createClient();
                        const { error } = await supabase.rpc('remove_panel_member', {
                          p_membership_id: member.id,
                          p_reason: removal.reason,
                        });
                        return { error };
                      }, `${member.name} is no longer seated.`);
                      if (ok) setRemoval(null);
                    }}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setRemoval({ id: member.id, reason: '' })}
                  disabled={busy}
                >
                  Remove
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {isOwner && panel.status !== 'dissolved' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <span>
            <label htmlFor={`seat-${panel.id}`}>Seat somebody</label>
            <select
              id={`seat-${panel.id}`}
              value={seat}
              onChange={(event) => setSeat(event.target.value)}
              disabled={busy}
            >
              <option value="">Choose a checked reviewer…</option>
              {candidates
                .filter((c) => c.appointed && !seated.has(c.reviewerProfileId))
                .map((c) => (
                  <option key={c.reviewerProfileId} value={c.reviewerProfileId}>{c.name}</option>
                ))}
            </select>
          </span>
          <span>
            <label htmlFor={`role-${panel.id}`}>As</label>
            <select
              id={`role-${panel.id}`}
              value={seatRole}
              onChange={(event) => setSeatRole(event.target.value)}
              disabled={busy}
            >
              <option value="member">Member</option>
              <option value="chair">Chair</option>
            </select>
          </span>
          <button
            type="button"
            className="btn"
            disabled={busy || !seat}
            onClick={async () => {
              const ok = await run(async () => {
                const supabase = createClient();
                const { error } = await supabase.rpc('add_panel_member', {
                  p_panel_id: panel.id,
                  p_reviewer_profile_id: seat,
                  p_member_role: seatRole,
                });
                return { error };
              }, 'Seated. Convene the panel once enough people are on it.');
              if (ok) setSeat('');
            }}
          >
            Seat
          </button>
        </div>
      )}

      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Only a checked reviewer who holds the board appointment can be seated — the owner makes
        the appointment on <a href="/admin/roles">Roles</a>, and governance checks the person on{' '}
        <a href="/admin/reviewers">the reviewer register</a>.
      </p>

      {isOwner && panel.status !== 'dissolved' && (
        <p style={{ margin: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {panel.status === 'inactive' ? (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run(async () => {
                const supabase = createClient();
                const { error } = await supabase.rpc('set_panel_status', {
                  p_panel_id: panel.id, p_status: 'active', p_reason: null,
                });
                return { error };
              }, 'The panel is convened. Cases can be opened and votes cast.')}
            >
              Convene the panel
            </button>
          ) : (
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => run(async () => {
                const supabase = createClient();
                const { error } = await supabase.rpc('set_panel_status', {
                  p_panel_id: panel.id, p_status: 'inactive', p_reason: null,
                });
                return { error };
              }, 'The panel is no longer sitting. Nothing can be voted on until it is convened again.')}
            >
              Close the panel
            </button>
          )}
          <button
            type="button"
            className="btn secondary"
            disabled={busy || openCases.length > 0}
            onClick={() => run(async () => {
              const supabase = createClient();
              const { error } = await supabase.rpc('set_panel_status', {
                p_panel_id: panel.id,
                p_status: 'dissolved',
                p_reason: 'Dissolved from the panel console.',
              });
              return { error };
            }, 'The panel is dissolved. Its cases stay on the record.')}
          >
            {openCases.length > 0 ? 'Dissolve — close its cases first' : 'Dissolve the panel'}
          </button>
        </p>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <h3 style={{ margin: '0 0 0.35rem' }}>Cases</h3>
        {panel.cases.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No case has been opened for this panel.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {panel.cases.map((row) => (
              <li key={row.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{row.courseTitle}</strong>{' '}
                <span className="muted">
                  — version {row.versionNumber} ({versionLabel(row.versionStatus)}) · {row.status} ·{' '}
                  {panel.quorum > 0 ? quorumSentence(row.tally.cast, panel.quorum) : ''} ·{' '}
                  {tallySentence(row.tally)}
                </span>
                {row.outcomeSummary && (
                  <p className="muted" style={{ margin: '0.2rem 0 0' }}>{row.outcomeSummary}</p>
                )}
                {(row.status === 'open' || row.status === 'deliberating') && (
                  decision?.id === row.id ? (
                    <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.35rem' }}>
                      <label htmlFor={`outcome-${row.id}`}>The panel&rsquo;s decision</label>
                      <select
                        id={`outcome-${row.id}`}
                        value={decision.outcome}
                        onChange={(event) => setDecision({ ...decision, outcome: event.target.value })}
                        disabled={busy}
                      >
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                      <label htmlFor={`summary-${row.id}`}>What was decided, in a sentence</label>
                      <textarea
                        id={`summary-${row.id}`}
                        value={decision.summary}
                        onChange={(event) => setDecision({ ...decision, summary: event.target.value })}
                        rows={2}
                        style={{ width: '100%', fontFamily: 'inherit' }}
                        disabled={busy}
                      />
                      {(() => {
                        const problem = outcomeProblem(decision.outcome, row.tally, panel.quorum);
                        return problem ? (
                          <div className="notice" style={{ margin: 0 }}>{problem}</div>
                        ) : null;
                      })()}
                      <p style={{ margin: 0, display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy || outcomeProblem(decision.outcome, row.tally, panel.quorum) !== null}
                          onClick={async () => {
                            const ok = await run(async () => {
                              const supabase = createClient();
                              const { error } = await supabase.rpc('decide_panel_case', {
                                p_case_id: row.id,
                                p_outcome: decision.outcome,
                                p_summary: decision.summary,
                              });
                              return { error };
                            }, 'The decision is recorded. A withdrawn case leaves the version unpublished.');
                            if (ok) setDecision(null);
                          }}
                        >
                          Record the decision
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => setDecision(null)}
                          disabled={busy}
                        >
                          Cancel
                        </button>
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ marginTop: '0.35rem' }}
                      onClick={() => setDecision({ id: row.id, outcome: 'approved', summary: '' })}
                      disabled={busy}
                    >
                      Record the decision
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}

        {panel.status === 'active' ? (
          available.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end', marginTop: '0.5rem' }}>
              <span>
                <label htmlFor={`case-${panel.id}`}>Open a case against a version</label>
                <select
                  id={`case-${panel.id}`}
                  value={versionId}
                  onChange={(event) => setVersionId(event.target.value)}
                  disabled={busy}
                >
                  <option value="">Choose a course version…</option>
                  {available.map((row) => (
                    <option key={row.versionId} value={row.versionId}>
                      {row.courseTitle} — version {row.versionNumber} ({versionLabel(row.versionStatus)})
                    </option>
                  ))}
                </select>
              </span>
              <button
                type="button"
                className="btn"
                disabled={busy || !versionId}
                onClick={async () => {
                  const ok = await run(async () => {
                    const supabase = createClient();
                    const { error } = await supabase.rpc('open_panel_case', {
                      p_panel_id: panel.id,
                      p_version_id: versionId,
                    });
                    return { error };
                  }, 'The case is open. Seated members can vote on it now.');
                  if (ok) setVersionId('');
                }}
              >
                Open the case
              </button>
            </div>
          ) : (
            <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
              No unpublished version is waiting for a case right now.
            </p>
          )
        ) : (
          <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            A case can only be opened while the panel is convened, and only the owner convenes one.
          </p>
        )}
      </div>
    </section>
  );
}
