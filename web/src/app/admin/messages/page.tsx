import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';

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
  created_at: string;
  sent_at: string | null;
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
 * It is deliberately staff-only and read-only. Nothing on this screen can mark
 * a row `sent`; only a provider's answer can, and the constraints refuse the
 * claim without one.
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

  const [deliveryOn, { data, error }] = await Promise.all([
    isFlagEnabled(supabase, 'delivery.notifications').catch(() => false),
    supabase
      .from('outbound_messages')
      .select('id,channel,template_code,purpose,to_address,subject,status,provider,attempts,last_error,created_at,sent_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (error) throw new Error(error.message);

  const messages = (data ?? []) as MessageRow[];
  const queued = messages.filter((m) => m.status === 'queued').length;
  const failed = messages.filter((m) => m.status === 'failed').length;

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

      <div className={`notice${deliveryOn ? '' : ' warn'}`}>
        {deliveryOn
          ? 'Email delivery is switched on in the register. A provider still has to be configured before a queued message can leave.'
          : 'No delivery provider is connected, so nothing here has left the platform. The rows are the record of what would have been sent.'}
      </div>

      <dl className="facts">
        <div>
          <dt>Recorded</dt>
          <dd>{messages.length}</dd>
        </div>
        <div>
          <dt>Queued</dt>
          <dd>{queued}</dd>
        </div>
        <div>
          <dt>Failed</dt>
          <dd>{failed}</dd>
        </div>
      </dl>

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
              {message.last_error && <p className="notice error">{message.last_error}</p>}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
