import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { deliveryNote, parseStanding, OutboxError } from '@/lib/outbox';
import { RetryForm } from './retry-form';
import { SuppressForm } from './suppress-form';

export const metadata = { title: 'Messages' };
export const dynamic = 'force-dynamic';

type MessageRow = {
  id: string;
  channel: 'email' | 'sms';
  template_code: string;
  purpose: string;
  to_address: string;
  subject: string | null;
  status: 'queued' | 'sent' | 'failed' | 'suppressed';
  provider: string | null;
  attempts: number;
  last_error: string | null;
  suppressed_reason: string | null;
  created_at: string;
  sent_at: string | null;
  dead_lettered_at: string | null;
};

const STATUS_CLASS: Record<MessageRow['status'], string> = {
  queued: 'badge warn',
  sent: 'badge ok',
  failed: 'badge warn',
  suppressed: 'badge',
};

function when(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * The outbox.
 *
 * This screen exists because "we sent you an email" was a sentence the platform
 * could not stand behind. `delivery.notifications` ships off and no provider is
 * configured, so what is shown here is what the platform *would* send: rendered
 * from a named template, recorded with who queued it and when, and marked
 * `queued` until something that can actually deliver it exists.
 *
 * What changed here is that the queue now has a state machine behind it. A row
 * is claimed for five minutes before anything tries to send it, a failure waits
 * on a backoff, and a row that fails the ceiling becomes a dead letter — which
 * is the only thing on this screen a person has to do anything about. The retry
 * is here rather than in SQL because the staff member looking at the failure is
 * the one who knows whether the provider is back.
 *
 * Nothing on this screen can mark a row `sent`. Only a provider's answer can,
 * and the constraints refuse the claim without a reference from it.
 */
export default async function AdminMessagesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/messages');

  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) redirect('/');

  const [{ data: rawStanding, error: standingError }, { data, error }] = await Promise.all([
    supabase.rpc('outbox_standing'),
    supabase
      .from('outbound_messages')
      .select(
        'id,channel,template_code,purpose,to_address,subject,status,provider,attempts,last_error,suppressed_reason,created_at,sent_at,dead_lettered_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (standingError) throw new Error(standingError.message);
  if (error) throw new Error(error.message);

  let standing;
  try {
    standing = parseStanding(rawStanding);
  } catch (e) {
    if (e instanceof OutboxError) throw new Error(e.message);
    throw e;
  }

  const messages = (data ?? []) as MessageRow[];

  return (
    <main className="page">
      <nav className="crumbs">
        <Link href="/admin">Admin</Link>
        <span aria-hidden>›</span>
        <span>Messages</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Outbox</p>
        <h1>Messages</h1>
        <p className="muted">
          Everything the platform would send, written down before it can be sent.
          A message is only <em>sent</em> when a delivery provider confirms it;
          until then it stays queued here.
        </p>
      </div>

      <div className={`notice${standing.deliveryEnabled ? '' : ' warn'}`}>
        {deliveryNote(standing)}
        {standing.deliveryEnabled
          ? ' A provider still has to be configured before a claimed message can leave.'
          : ''}
      </div>

      <dl className="facts">
        <div>
          <dt>Queued</dt>
          <dd>{standing.counts.queued}</dd>
        </div>
        <div>
          <dt>Due now</dt>
          <dd>{standing.counts.dueNow}</dd>
        </div>
        <div>
          <dt>Being sent</dt>
          <dd>{standing.counts.inFlight}</dd>
        </div>
        <div>
          <dt>Sent</dt>
          <dd>{standing.counts.sent}</dd>
        </div>
        <div>
          <dt>Dead letters</dt>
          <dd>{standing.counts.failed}</dd>
        </div>
        <div>
          <dt>Addresses not written to</dt>
          <dd>{standing.suppressedAddresses}</dd>
        </div>
      </dl>

      <p className="muted">
        A message is tried up to <strong>{standing.maxAttempts}</strong> time
        {standing.maxAttempts === 1 ? '' : 's'} before it becomes a dead letter. The
        wait between tries grows each time. That number is a control on{' '}
        <Link href="/admin/settings">the controls screen</Link>.
        {standing.oldestQueuedAt
          ? ` The oldest message still waiting was written ${when(standing.oldestQueuedAt)} UTC.`
          : ''}
      </p>

      <h2>Dead letters</h2>
      {standing.deadLetters.length === 0 ? (
        <p className="empty">
          Nothing has been given up on. A message appears here when it has failed
          every attempt it was allowed.
        </p>
      ) : (
        <div className="stack">
          {standing.deadLetters.map((letter) => (
            <article className="card" key={letter.id}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <strong>{letter.template}</strong>
                  <p className="meta">
                    to {letter.to} · {letter.attempts} attempt
                    {letter.attempts === 1 ? '' : 's'}
                    {letter.deadLetteredAt
                      ? ` · given up ${when(letter.deadLetteredAt)} UTC`
                      : ''}
                  </p>
                </div>
                <span className="badge warn">dead letter</span>
              </div>
              {letter.lastError && <p className="notice error">{letter.lastError}</p>}
              <RetryForm id={letter.id} />
            </article>
          ))}
        </div>
      )}

      <h2>Everything recorded</h2>
      {messages.length === 0 ? (
        <p className="empty">
          Nothing has been queued yet. Receipts and invitations will appear here
          as they are written.
        </p>
      ) : (
        <div className="stack">
          {messages.map((message) => (
            <article className="card" key={message.id}>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div>
                  <strong>{message.subject ?? `${message.channel.toUpperCase()} message`}</strong>
                  <p className="meta">
                    {message.template_code} · to {message.to_address} · queued {when(message.created_at)} UTC
                  </p>
                </div>
                <span className={STATUS_CLASS[message.status]}>{message.status}</span>
              </div>

              <p className="meta">
                {message.channel} · {message.purpose} · attempts {message.attempts}
                {message.provider ? ` · via ${message.provider}` : ' · no provider'}
              </p>

              {message.sent_at && <p className="meta">Sent {when(message.sent_at)} UTC</p>}
              {message.suppressed_reason && (
                <p className="meta">Not written to: {message.suppressed_reason}</p>
              )}
              {message.last_error && <p className="notice error">{message.last_error}</p>}
            </article>
          ))}
        </div>
      )}

      <h2>Stop writing to an address</h2>
      <SuppressForm />
    </main>
  );
}
