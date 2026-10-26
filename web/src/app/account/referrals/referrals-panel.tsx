'use client';

import { useState } from 'react';

import {
  REFERRAL_HONESTY,
  describePerson,
  describeReward,
  inviteMessage,
  referralLink,
  rewardIsLive,
  type ReferralBoard,
} from '@/lib/referrals';

/**
 * The invitation panel.
 *
 * One thing to do — share the code — and one thing to read: what came of it.
 * Nothing here promises money, and a reward that has not started says when it
 * starts instead of pretending it can be used now.
 */
export function ReferralsPanel({
  board,
  origin,
  displayName,
}: {
  board: ReferralBoard;
  origin: string;
  displayName: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const link = referralLink(board.code, origin);
  const message = inviteMessage({
    code: board.code,
    percent: board.refereePercent,
    link,
    inviterName: displayName,
  });

  async function copy(what: 'link' | 'message') {
    const value = what === 'link' ? link : message;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // A browser that refuses the clipboard is not an error worth shouting
      // about: the text is on screen and can be selected by hand.
      setCopied(null);
    }
  }

  if (!board.enabled) {
    return (
      <div className="notice">
        Inviting a friend is not switched on yet. When the owner turns it on, this page
        will show your code and every course it has helped somebody take. Nothing has
        been lost in the meantime: there is no code to lose.
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Your invitation code</h2>
          {board.code && <span className="badge neutral">{board.code}</span>}
        </div>

        {board.code ? (
          <>
            <p className="meta" style={{ marginTop: '0.5rem' }}>
              Your friend gets {board.refereePercent}% off their first course. When they
              buy one, you get {board.rewardPercent}% off your next course once their
              payment has stayed past the refund window.
            </p>

            <div className="row" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={() => copy('link')}>
                {copied === 'link' ? 'Link copied' : 'Copy invite link'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => copy('message')}
              >
                {copied === 'message' ? 'Message copied' : 'Copy a message'}
              </button>
            </div>

            {link && (
              <p className="muted" style={{ marginTop: '0.75rem', wordBreak: 'break-all' }}>
                {link}
              </p>
            )}
          </>
        ) : (
          <p className="meta" style={{ marginTop: '0.5rem' }}>
            Your code is created the first time this page opens and lasts for good. If it
            is still missing, reload the page once.
          </p>
        )}
      </section>

      <section className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Rewards you have earned</h2>
          <span className="badge neutral">
            {board.rewards.length} {board.rewards.length === 1 ? 'reward' : 'rewards'}
          </span>
        </div>

        {board.rewards.length === 0 ? (
          <p className="empty">
            Nothing yet. A reward appears here once somebody uses your code and their
            payment has settled.
          </p>
        ) : (
          <ul className="lessons">
            {board.rewards.map((reward, index) => (
              <li key={`${reward.code ?? reward.status}-${reward.earnedAt ?? index}`}>
                <span className="badge neutral">{reward.code ?? 'No code'}</span>
                {reward.percent !== null && (
                  <span className="muted"> · {reward.percent}% off a course</span>
                )}
                <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                  {describeReward(reward)}
                  {rewardIsLive(reward)
                    ? ' Type it in the code box on the payment page of any course you are buying.'
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="outline-h" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Who you invited</h2>
          <span className="badge neutral">
            {board.joined} {board.joined === 1 ? 'person' : 'people'}
          </span>
        </div>

        {board.invited.length === 0 ? (
          <p className="empty">
            Nobody yet. People appear here once they have used your code on a purchase.
          </p>
        ) : (
          <ul className="lessons">
            {board.invited.map((person, index) => (
              <li key={`${person.name}-${person.joinedAt ?? index}`}>
                <strong>{person.name}</strong>
                <p className="meta" style={{ margin: '0.25rem 0 0' }}>
                  {describePerson(person)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Only a first name is shown. What somebody else learns, and with whom, is not
          yours to see because you invited them.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>How it works</h2>
        <ol className="lessons">
          <li>
            <p className="meta" style={{ margin: 0 }}>
              You send the link. They open it and see what the code is worth before they
              decide anything.
            </p>
          </li>
          <li>
            <p className="meta" style={{ margin: 0 }}>
              They type it while buying their first course, and the discount shows on the
              receipt they keep.
            </p>
          </li>
          <li>
            <p className="meta" style={{ margin: 0 }}>
              Once their payment has stayed past the refund window, your reward code is
              created and works for {board.expiryDays} days. If they are refunded before
              it starts, no reward is created.
            </p>
          </li>
          <li>
            <p className="meta" style={{ margin: 0 }}>
              You may earn up to {board.maxPerYear} reward
              {board.maxPerYear === 1 ? '' : 's'} in twelve months. Each one is an ordinary
              discount on an ordinary order, with an ordinary receipt.
            </p>
          </li>
        </ol>
        <p className="muted" style={{ marginTop: '0.75rem' }}>{REFERRAL_HONESTY}</p>
      </section>
    </div>
  );
}
