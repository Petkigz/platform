'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { localeByCode, type LocaleCode } from '@/lib/i18n';
import {
  acceptedBlock,
  coverageOfReviews,
  dayOf,
  reviewState,
  sectionName,
  type PartCoverage,
  type ProposalState,
  type Review,
} from '@/lib/translations';

/**
 * The queue, and the two things the owner does with it: decide each correction,
 * and publish the review.
 *
 * **No edit button, and no apply button.** A correction is not applied by being
 * accepted; it is applied by reaching the catalogue file, and this console says
 * which of the two has happened by asking the catalogue that is actually built.
 * That is why every row carries a state — *in the code still*, *applied*, *the
 * file moved past this* — and why the paste block exists: the last act is a
 * copy and a commit, and pretending otherwise would mean a console that says a
 * language is fixed while the site still says the old words in it.
 */
export function TranslationConsole({
  reviews,
  states,
  coverage,
}: {
  reviews: Review[];
  /**
   * How much of each language has been read, added up from published reviews and
   * worked out on the server. A part read is one part; the language is only
   * describable as read when none is missing.
   */
  coverage: Record<string, PartCoverage>;
  /**
   * Whether each correction is in the code, worked out on the server against the
   * catalogue that is actually built.
   *
   * Passed in rather than computed here on purpose: this is a client component,
   * and importing the translator would ship all fifty-one catalogues to the
   * browser to answer a question about fourty rows.
   */
  states: Record<string, ProposalState>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const supabase = useMemo(() => createClient(), []);

  async function decide(proposalId: string, accept: boolean) {
    setError(null);
    setBusy(proposalId);
    const { error: failure } = await supabase.rpc('decide_translation_proposal', {
      p_proposal_id: proposalId,
      p_accept: accept,
    });
    setBusy(null);
    if (failure) {
      setError(sentenceFor(failure.message));
      return;
    }
    startTransition(() => router.refresh());
  }

  async function publish(reviewId: string) {
    setError(null);
    setBusy(reviewId);
    const { error: failure } = await supabase.rpc('publish_translation_review', {
      p_review_id: reviewId,
    });
    setBusy(null);
    if (failure) {
      setError(sentenceFor(failure.message));
      return;
    }
    startTransition(() => router.refresh());
  }

  async function decline(reviewId: string) {
    setError(null);
    if (!reason.trim()) {
      setError('A refusal needs a reason on the record.');
      return;
    }
    setBusy(reviewId);
    const { error: failure } = await supabase.rpc('decline_translation_review', {
      p_review_id: reviewId,
      p_reason: reason.trim(),
    });
    setBusy(null);
    if (failure) {
      setError(sentenceFor(failure.message));
      return;
    }
    setDeclining(null);
    setReason('');
    startTransition(() => router.refresh());
  }

  async function copy(review: Review) {
    const block = acceptedBlock(review);
    try {
      await navigator.clipboard.writeText(block);
      setCopied(review.id);
    } catch {
      setError('The clipboard refused. Select the block and copy it by hand.');
    }
  }

  if (reviews.length === 0) {
    return (
      <p className="muted">
        Nothing has been submitted yet. Nobody has offered a correction to any of the
        fifty-one languages, which is the honest state of the translation work and the
        reason <code>/language</code> still says nobody has read it.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {error && <div className="notice warn">{error}</div>}

      {reviews.map((review) => {
        const locale = localeByCode(review.locale as LocaleCode);
        const block = acceptedBlock(review);
        const undecided = review.proposals.filter((p) => p.status === 'proposed').length;
        const canPublish =
          review.status === 'submitted' && review.scope !== 'part' && undecided === 0;
        const parts = coverage[review.locale] ?? coverageOfReviews([]);

        return (
          <section className="card" key={review.id}>
            <p className="eyebrow" style={{ marginBottom: '0.3rem' }}>
              {locale.englishName} · <span lang={locale.code} dir={locale.dir}>{locale.nativeName}</span>
            </p>
            <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>{review.reviewerName}</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              submitted {dayOf(review.createdAt)}
              {review.scope === 'whole'
                ? ' · says they read the whole catalogue'
                : review.scope === 'section'
                  ? ` · read ${sectionName(review.section)}`
                  : ' · read part of it'}
              {review.reviewerEmail ? ` · ${review.reviewerEmail}` : ''}
            </p>
            <p style={{ marginTop: 0, fontSize: '0.92rem' }}>{reviewState(review)}</p>
            {/* What this language needs before it can be called read. Three parts
                out of sixteen is real progress and is not that sentence, and the
                console says which of the two it is rather than letting the owner
                guess from a list of cards. */}
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
              {parts.complete
                ? 'Every part of this language has a published read.'
                : `${parts.read} of ${parts.total} parts read — still missing ${parts.missing
                    .slice(0, 4)
                    .map((section) => sectionName(section.prefix))
                    .join(', ')}${parts.missing.length > 4 ? ` and ${parts.missing.length - 4} more` : ''}.`}
            </p>
            {review.note && (
              <p style={{ fontSize: '0.92rem' }}>
                <strong>Their note:</strong> {review.note}
              </p>
            )}

            {review.proposals.length > 0 && (
              <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
                {review.proposals.map((proposal) => {
                  const state = states[proposal.id] ?? 'unknown';
                  return (
                    <div key={proposal.id} style={{ borderInlineStart: '3px solid var(--border, #d8d8d8)', paddingInlineStart: '0.8rem' }}>
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        <code>{proposal.messageKey}</code>
                        {' · '}
                        {state === 'applied' && <strong>already in the code</strong>}
                        {state === 'pending' && <>still says the old line</>}
                        {state === 'stale' && <>the file moved past this</>}
                        {state === 'unknown' && <>key not in the catalogue</>}
                      </p>
                      <p style={{ margin: '0 0 0.15rem', fontSize: '0.88rem', color: 'var(--muted)', textDecoration: 'line-through' }}>
                        {proposal.currentText}
                      </p>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }} lang={locale.code} dir={locale.dir}>
                        {proposal.proposedText}
                      </p>
                      {proposal.reason && (
                        <p className="muted" style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
                          {proposal.reason}
                        </p>
                      )}
                      {review.status === 'submitted' && proposal.status === 'proposed' && (
                        <p style={{ margin: 0, display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn"
                            disabled={busy === proposal.id || pending}
                            onClick={() => decide(proposal.id, true)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            disabled={busy === proposal.id || pending}
                            onClick={() => decide(proposal.id, false)}
                          >
                            Reject
                          </button>
                          {state === 'applied' && (
                            <span className="muted" style={{ alignSelf: 'center', fontSize: '0.85rem' }}>
                              the code already says this — accept it and publish
                            </span>
                          )}
                        </p>
                      )}
                      {proposal.status !== 'proposed' && (
                        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                          {proposal.status === 'accepted' ? 'Accepted' : 'Rejected'}
                          {proposal.decidedAt ? ` ${dayOf(proposal.decidedAt)}` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {block && (
              <div style={{ marginTop: '1.1rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>
                  Accepted corrections — paste into the catalogue for {locale.englishName}
                </h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                  Accepting a correction does not change the site. These lines do, once they
                  are in the file — and until then this page keeps saying so.
                </p>
                <pre
                  style={{
                    overflowX: 'auto',
                    padding: '0.8rem',
                    background: 'var(--surface-muted, #f6f6f4)',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                >
                  {block}
                </pre>
                <button type="button" className="btn secondary" onClick={() => copy(review)}>
                  {copied === review.id ? 'Copied' : 'Copy these lines'}
                </button>
              </div>
            )}

            {review.status === 'submitted' && (
              <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn"
                  disabled={!canPublish || busy === review.id || pending}
                  onClick={() => publish(review.id)}
                >
                  Publish this review
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy === review.id || pending}
                  onClick={() => setDeclining(declining === review.id ? null : review.id)}
                >
                  Decline
                </button>
                {!canPublish && (
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    {review.scope === 'part'
                      ? 'A partial read cannot make the language “read”.'
                      : `${undecided} correction${undecided === 1 ? '' : 's'} still undecided.`}
                  </span>
                )}
              </div>
            )}

            {declining === review.id && (
              <div style={{ marginTop: '0.8rem' }}>
                <label htmlFor={`reason-${review.id}`} style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                  Why it is being declined (recorded, and shown to nobody)
                </label>
                <textarea
                  id={`reason-${review.id}`}
                  rows={2}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  style={{ width: '100%', fontFamily: 'inherit' }}
                />
                <button
                  type="button"
                  className="btn secondary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => decline(review.id)}
                >
                  Record the refusal
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** A refusal code from the database, as a sentence the owner can act on. */
export function sentenceFor(code: string): string {
  if (code.includes('translation:not_owner')) {
    return 'Only the platform admin decides what a language has been read in.';
  }
  if (code.includes('translation:partial_read')) {
    return 'That submission says they read part of the catalogue. Record the corrections, but the language cannot be described as read.';
  }
  if (code.includes('translation:wrong_section')) {
    return 'One of those corrections is about a different part of the site from the one this submission covers. Decide what you can, and ask them to send the rest under the right part.';
  }
  if (code.includes('translation:undecided')) {
    return 'Decide every correction first. A language marked as read with a queue behind it is a claim made early.';
  }
  if (code.includes('translation:already_decided')) {
    return 'That one has already been decided. Reload the page to see where it stands.';
  }
  if (code.includes('translation:needs_reason')) {
    return 'A refusal needs a reason on the record.';
  }
  if (code.includes('translation:review_closed')) {
    return 'That submission is closed — reload the page.';
  }
  return code;
}
