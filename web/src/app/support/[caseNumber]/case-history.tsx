import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AGE_BAND_LABEL } from '@/lib/family';
import { VERSION_STATUS_LABEL } from '@/lib/authoring';
import { format, fromMinor, isCurrency } from '@/lib/money';
import {
  fetchCaseHistory,
  HISTORY_ENROLMENT_STATUS_LABEL,
  HISTORY_ENTITLEMENT_EVENT_LABEL,
  HISTORY_ENTITLEMENT_STATUS_LABEL,
  HISTORY_LEARNER_TYPE_LABEL,
  HISTORY_ORDER_STATUS_LABEL,
  HISTORY_PUBLICATION_EVENT_LABEL,
  HISTORY_REPIN_METHOD_LABEL,
  HISTORY_SHARE_SCOPE_LABEL,
  HISTORY_SHARE_STATUS_LABEL,
  HISTORY_SUBSCRIPTION_STATUS_LABEL,
  type CaseHistory,
  type CaseHistoryStatusStep,
} from '@/lib/support';

/**
 * What happened, for the person answering.
 *
 * The whole panel comes from one call to `support_case_history()`. That function is
 * SECURITY DEFINER, so it is also the only thing deciding what a member of staff
 * may see here: the tables behind it — order and subscription status history,
 * entitlement events, enrolment re-pins, publication events, progress shares — are
 * closed to every other read path, and this file queries none of them.
 *
 * The bundle is scoped to the person who asked, not to the person reading. It is
 * worth saying out loud on the screen, because the alternative reading of a panel
 * like this is "here is everything", and an agent who believes that will start
 * trusting it for cases it was never asked about.
 *
 * It renders for staff only because the function refuses everybody else anyway;
 * mounting it for a requester would buy nothing and show them an error where their
 * conversation should be.
 */

const when = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

const day = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

/** A word from the schema, in a sentence a person would write. An unknown value is
 *  shown as it is: guessing a label for a status this file has not heard of would
 *  be the panel inventing an answer. */
const word = (
  labels: Record<string, string>,
  value: string | null | undefined,
): string => (value ? (labels[value] ?? value) : '—');

const money = (minor: number | null, currency: string | null): string => {
  if (minor === null) return '—';
  if (!currency || !isCurrency(currency)) return `${minor} minor units`;
  return format(fromMinor(minor, currency));
};

function Steps({ steps }: { steps: CaseHistoryStatusStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ul className="lessons" style={{ marginTop: '0.35rem' }}>
      {steps.map((step, index) => (
        // The history tables are append-only and carry no usable identity of their
        // own in this bundle, so the position is the key.
        // eslint-disable-next-line react/no-array-index-key
        <li key={index} style={{ padding: '0.35rem 0' }}>
          <span className="t">
            {step.fromStatus ?? '—'} → {step.toStatus ?? '—'}
            {step.reason ? <span className="muted"> · {step.reason}</span> : null}
          </span>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {step.changedByName ?? 'the platform'} · {when(step.occurredAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function HistorySection({
  title,
  total,
  shown,
  empty,
  children,
}: {
  title: string;
  total: number;
  shown: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <details style={{ marginTop: '0.75rem' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--green-700, #176b45)' }}>
        {title} <span className="badge neutral">{total}</span>
        {total > shown ? (
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {' · newest '}
            {shown}
            {' of '}
            {total}
          </span>
        ) : null}
      </summary>
      {shown === 0 ? (
        <p className="empty" style={{ marginBottom: 0 }}>
          {empty}
        </p>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>{children}</div>
      )}
    </details>
  );
}

function Bundle({ history }: { history: CaseHistory }) {
  const learners = history.learners;

  return (
    <>
      <dl className="facts">
        <div>
          <dt>Asked by</dt>
          <dd>
            {history.requester?.displayName ?? 'An account with no name'}
            {history.requester?.accountStatus && history.requester.accountStatus !== 'active' ? (
              <span className="badge warn" style={{ marginLeft: '0.4rem' }}>
                {history.requester.accountStatus}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>About</dt>
          <dd>
            {history.learner
              ? `${history.learner.displayName ?? 'A learner'} — named on the case`
              : learners.length === 0
                ? 'Nobody named, and this account has no learner profiles'
                : 'Every learner this person could see'}
          </dd>
        </div>
        <div>
          <dt>Snapshot</dt>
          <dd>{when(history.generatedAt)}</dd>
        </div>
      </dl>

      {learners.length > 0 && (
        <div className="chips" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          {learners.map((learner) => (
            <span className="chip" key={learner.id}>
              {learner.displayName ?? 'A learner'}
              {' · '}
              {word(HISTORY_LEARNER_TYPE_LABEL, learner.learnerType)}
              {learner.ageBand ? ` · ${AGE_BAND_LABEL[learner.ageBand] ?? learner.ageBand}` : ''}
              {learner.isRequester ? ' · them' : ''}
              {learner.status && learner.status !== 'active' ? ` · ${learner.status}` : ''}
            </span>
          ))}
        </div>
      )}

      <HistorySection
        title="Orders"
        total={history.orders.total}
        shown={history.orders.rows.length}
        empty="No orders on any account this person could see. If they say they paid, the payment is not on an account they belong to — ask for the reference and who paid it."
      >
        <ul className="lessons">
          {history.orders.rows.map((order) => (
            <li key={order.id} style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}>
              <span className="t">
                <strong>{money(order.totalMinor, order.currencyCode)}</strong>
                {' · '}
                {word(HISTORY_ORDER_STATUS_LABEL, order.status)}
                {order.isCaseOrder ? (
                  <span className="badge warn" style={{ marginLeft: '0.4rem' }}>
                    Named on this case
                  </span>
                ) : null}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Placed {when(order.placedAt)}
                {order.paidAt ? ` · paid ${when(order.paidAt)}` : ''}
                {order.cancelledAt ? ` · cancelled ${when(order.cancelledAt)}` : ''}
              </span>
              <Steps steps={order.history} />
            </li>
          ))}
        </ul>
      </HistorySection>

      <HistorySection
        title="Subscriptions"
        total={history.subscriptions.total}
        shown={history.subscriptions.rows.length}
        empty="No subscription has ever been started on these accounts, so a plan is not the reason anything is or is not visible."
      >
        <ul className="lessons">
          {history.subscriptions.rows.map((subscription) => (
            <li
              key={subscription.id}
              style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}
            >
              <span className="t">
                <strong>{subscription.planName ?? 'A plan'}</strong>
                {' · '}
                {word(HISTORY_SUBSCRIPTION_STATUS_LABEL, subscription.status)}
                {subscription.billingInterval ? ` · ${subscription.billingInterval}` : ''}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Started {day(subscription.startedAt)}
                {subscription.currentPeriodEnd
                  ? ` · current period ends ${day(subscription.currentPeriodEnd)}`
                  : ''}
                {subscription.cancelReason ? ` · ${subscription.cancelReason}` : ''}
              </span>
              <Steps steps={subscription.history} />
            </li>
          ))}
        </ul>
      </HistorySection>

      <HistorySection
        title="Access grants"
        total={history.entitlements.total}
        shown={history.entitlements.rows.length}
        empty="These learners have never been granted access to a course or a feature. That is the answer to “why can’t I open it”: nothing was ever granted, so look at the order above rather than at the lesson."
      >
        <ul className="lessons">
          {history.entitlements.rows.map((grant) => (
            <li key={grant.id} style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}>
              <span className="t">
                <strong>{grant.courseTitle ?? grant.featureCode ?? grant.scopeType ?? 'A grant'}</strong>
                {' · '}
                {word(HISTORY_ENTITLEMENT_STATUS_LABEL, grant.status)}
                {grant.learnerName ? ` · ${grant.learnerName}` : ''}
                {grant.revocationReason ? (
                  <span className="muted"> · {grant.revocationReason}</span>
                ) : null}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                From {day(grant.effectiveFrom)}
                {grant.effectiveUntil ? ` until ${day(grant.effectiveUntil)}` : ''}
                {grant.sourceType ? ` · ${grant.sourceType}` : ''}
              </span>
              {grant.events.length > 0 && (
                <ul className="lessons" style={{ marginTop: '0.35rem' }}>
                  {grant.events.map((event, index) => (
                    // Append-only events with no id in the bundle.
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={index} style={{ padding: '0.35rem 0' }}>
                      <span className="t">
                        {word(HISTORY_ENTITLEMENT_EVENT_LABEL, event.eventType)}
                        {event.reason ? <span className="muted"> · {event.reason}</span> : null}
                      </span>
                      <span className="muted" style={{ fontSize: '0.85rem' }}>
                        {event.performedByName ?? 'the platform'} · {when(event.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </HistorySection>

      <HistorySection
        title="Enrolments"
        total={history.enrolments.total}
        shown={history.enrolments.rows.length}
        empty="Nobody in scope is enrolled in anything."
      >
        <ul className="lessons">
          {history.enrolments.rows.map((enrolment) => (
            <li
              key={enrolment.id}
              style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}
            >
              <span className="t">
                <strong>{enrolment.courseTitle ?? 'A course'}</strong>
                {enrolment.versionNumber != null ? ` · version ${enrolment.versionNumber}` : ''}
                {' · '}
                {word(HISTORY_ENROLMENT_STATUS_LABEL, enrolment.status)}
                {enrolment.learnerName ? ` · ${enrolment.learnerName}` : ''}
                {enrolment.versionStatus ? (
                  <span className="badge neutral" style={{ marginLeft: '0.4rem' }}>
                    {word(VERSION_STATUS_LABEL, enrolment.versionStatus)}
                  </span>
                ) : null}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Enrolled {when(enrolment.enrolledAt)}
                {enrolment.completedAt ? ` · completed ${day(enrolment.completedAt)}` : ''}
                {enrolment.source ? ` · ${enrolment.source}` : ''}
              </span>
              {enrolment.versionHistory.length > 0 && (
                <ul className="lessons" style={{ marginTop: '0.35rem' }}>
                  {enrolment.versionHistory.map((step, index) => (
                    // Append-only history with no id in the bundle.
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={index} style={{ padding: '0.35rem 0' }}>
                      <span className="t">
                        Moved to a different version
                        <span className="muted">
                          {' · '}
                          {word(HISTORY_REPIN_METHOD_LABEL, step.method)}
                          {step.reason ? ` · ${step.reason}` : ''}
                        </span>
                      </span>
                      <span className="muted" style={{ fontSize: '0.85rem' }}>
                        {step.initiatorName ?? 'the platform'} · {when(step.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </HistorySection>

      <HistorySection
        title="Course publication"
        total={history.publicationEvents.total}
        shown={history.publicationEvents.rows.length}
        empty="Nothing has been recorded about the versions these learners are enrolled in, so a missing lesson was not withdrawn or retired — look for it in the course itself."
      >
        <ul className="lessons">
          {history.publicationEvents.rows.map((event, index) => (
            // The same version can be published and retired more than once, and the
            // bundle carries no event id.
            // eslint-disable-next-line react/no-array-index-key
            <li key={index} style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}>
              <span className="t">
                <strong>{event.courseTitle ?? 'A course'}</strong>
                {event.versionNumber != null ? ` · version ${event.versionNumber}` : ''}
                {' · '}
                {word(HISTORY_PUBLICATION_EVENT_LABEL, event.eventType)}
                {event.reason ? <span className="muted"> · {event.reason}</span> : null}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {event.performedByName ?? 'the platform'} · {when(event.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      </HistorySection>

      <HistorySection
        title="Who else can see this progress"
        total={history.shares.total}
        shown={history.shares.rows.length}
        empty="Nobody has been given sight of these learners' progress or achievements. No screen can create one yet, so an empty list here is the normal answer."
      >
        <ul className="lessons">
          {history.shares.rows.map((share) => (
            <li key={share.id} style={{ display: 'grid', gap: '0.2rem', alignItems: 'start' }}>
              <span className="t">
                <strong>{share.granteeName ?? 'Somebody'}</strong>
                {' · '}
                {word(HISTORY_SHARE_SCOPE_LABEL, share.scope)}
                {' of '}
                {share.learnerName ?? 'a learner'}
                {' · '}
                {word(HISTORY_SHARE_STATUS_LABEL, share.status)}
              </span>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                Granted {day(share.grantedAt)}
                {share.expiresAt ? ` · expires ${day(share.expiresAt)}` : ''}
                {share.revokedAt ? ` · revoked ${day(share.revokedAt)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </HistorySection>

      <p className="muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
        Refusals are not recorded. The schema has a table for explaining why a
        learner was refused a lesson, and nothing in the platform has ever written a
        row to it, so there is no denial log to read here. To answer “why was I
        refused”, read the access grant and the enrolment above: a refusal is a
        missing, expired, suspended or revoked grant, or a version that was retired.
      </p>
    </>
  );
}

export async function CaseHistory({ caseId }: { caseId: string }) {
  const supabase = await createClient();
  const result = await fetchCaseHistory(supabase, caseId);

  return (
    <section className="card">
      <h2>What happened</h2>
      <p className="muted">
        The orders, subscriptions, access grants, enrolments and course decisions
        behind this case, as they changed over time. This is the history of the
        person who asked and the learners and payments they could see — not
        everything on the platform, and not a record of what you may change.
      </p>

      {!result.ok ? (
        <p className="notice error" style={{ marginBottom: 0 }}>
          {result.error}
        </p>
      ) : (
        <Bundle history={result.history} />
      )}
    </section>
  );
}
