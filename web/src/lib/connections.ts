import { resolveEmailProvider, DEFAULT_FROM } from './email/provider.ts';
import { isResendWebhookConfigured } from './email/provider-events.ts';

/**
 * Which outside accounts this deployment has been connected to.
 *
 * The platform is built to run before its accounts exist: with no email key
 * nothing is claimed, with no scheduler secret the scheduler routes answer
 * 503, with no payment provider the buy page says so. That is safe, and it is
 * also silent: nothing lists, in one place, what is still unconnected. This
 * does. The owner connects an account by setting its variables in the
 * deployment's environment; this reads which are set.
 *
 * **Presence, not proof.** A variable that is set may still hold a wrong
 * value. Where the platform can tell a wrong shape (a sender that is not an
 * address, a webhook secret that is not one) it says so. Whether the account
 * accepts the value is answered by the probes named beside each connection.
 *
 * **Names, never values.** Nothing here returns what a variable holds: only
 * the names of the ones that are missing.
 */
type Env = Record<string, string | undefined>;

export type ConnectionState = 'connected' | 'partly' | 'not_connected';

export type Connection = {
  id: string;
  name: string;
  /** What stops working, in plain words, while this is not connected. */
  without: string;
  state: ConnectionState;
  /** Names of the variables still to set. Never a value. */
  missing: string[];
  /** A thing this page noticed, or a way to check the connection for real. */
  notes: string[];
};

const has = (env: Env, name: string) => (env[name] ?? '').trim().length > 0;

function fromNames(env: Env, names: string[]): { state: ConnectionState; missing: string[] } {
  const missing = names.filter((name) => !has(env, name));
  const state: ConnectionState = missing.length === 0 ? 'connected' : missing.length === names.length ? 'not_connected' : 'partly';
  return { state, missing };
}

/**
 * Payment providers can be set for one country or for several (the adapters
 * also read names scoped by country, such as MTN_MOMO_UG_API_KEY), so this
 * page does not judge whether a provider's variables are complete. It says
 * whether any exist. `names` are the first ones the runbook asks for.
 */
const PAYMENT_PROVIDERS: Array<{ id: string; name: string; prefix: string; names: string[] }> = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', prefix: 'MTN_MOMO_', names: ['MTN_MOMO_SUBSCRIPTION_KEY', 'MTN_MOMO_API_USER', 'MTN_MOMO_API_KEY'] },
  { id: 'airtel', name: 'Airtel Money', prefix: 'AIRTEL_', names: ['AIRTEL_CLIENT_ID', 'AIRTEL_CLIENT_SECRET'] },
  { id: 'mpesa_ke', name: 'M-Pesa (Kenya)', prefix: 'MPESA_KE_', names: ['MPESA_KE_CONSUMER_KEY', 'MPESA_KE_CONSUMER_SECRET', 'MPESA_KE_SHORTCODE', 'MPESA_KE_PASSKEY'] },
  { id: 'pawapay', name: 'pawaPay', prefix: 'PAWAPAY_', names: ['PAWAPAY_API_TOKEN'] },
];

export function readConnections(env: Env): Connection[] {
  const list: Connection[] = [];

  const database = fromNames(env, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
  list.push({
    id: 'database', name: 'Database and sign-in (Supabase)',
    without: 'Nothing works without the first two. Without the service role key: payment callbacks, child logins, the private alerts and the email provider\'s reports.',
    ...database, notes: [],
  });

  const siteSet = has(env, 'NEXT_PUBLIC_SITE_URL');
  list.push({
    id: 'site', name: 'The site\'s own address',
    without: 'Links in emails and alerts cannot name the site, and say "sign in to AyahSpring" instead.',
    state: siteSet ? 'connected' : 'not_connected', missing: siteSet ? [] : ['NEXT_PUBLIC_SITE_URL'],
    notes: ['Set it to the address people type. When the domain changes, change it here and redeploy.'],
  });

  const provider = resolveEmailProvider(env);
  const emailNotes: string[] = [];
  let emailState: ConnectionState = 'not_connected';
  const emailMissing: string[] = [];
  if (provider.kind === 'resend') {
    emailState = 'connected';
    if (!has(env, 'EMAIL_FROM')) emailNotes.push(`No sender is set, so ${DEFAULT_FROM} is used. It only sends once that domain's DNS records are verified at Resend.`);
    if (!provider.replyTo) emailNotes.push('EMAIL_REPLY_TO is not set, so a reply to a message goes nowhere.');
  } else if (has(env, 'RESEND_API_KEY')) {
    emailState = 'partly';
    emailNotes.push('A key is set, but the sender (EMAIL_FROM) is not an address.');
    emailMissing.push('EMAIL_FROM');
  } else {
    emailMissing.push('RESEND_API_KEY');
  }
  emailNotes.push('To ask Resend itself whether the key and the domain are ready: the "Resend probe" (runbook 7.0).');
  list.push({
    id: 'email', name: 'Sending email (Resend)',
    without: 'No email leaves: receipts, invitations, guardian messages and the owner\'s alerts wait in the outbox.',
    state: emailState, missing: emailMissing, notes: emailNotes,
  });

  const hookRaw = has(env, 'RESEND_WEBHOOK_SECRET');
  const hookOk = isResendWebhookConfigured(env.RESEND_WEBHOOK_SECRET);
  list.push({
    id: 'email_reports', name: 'What became of an email (Resend webhook)',
    without: 'A message that bounces after Resend accepted it is never learned of, and the address is written to again.',
    state: hookOk ? 'connected' : hookRaw ? 'partly' : 'not_connected',
    missing: hookOk ? [] : ['RESEND_WEBHOOK_SECRET'],
    notes: [
      ...(hookRaw && !hookOk ? ['A value is set, but it is not a signing secret: it begins with whsec_.'] : []),
      'The webhook is made at Resend and pointed at /api/email/webhook on this site (runbook 7.7).',
    ],
  });

  const scheduler = fromNames(env, ['CRON_SECRET', 'EMAIL_WORKER_EMAIL', 'EMAIL_WORKER_PASSWORD', 'RETENTION_WORKER_EMAIL', 'RETENTION_WORKER_PASSWORD']);
  list.push({
    id: 'scheduler', name: 'The scheduler (unattended work)',
    without: 'Queued email goes only when a person presses "Send what is due now"; alerts and the retention cleanup do not run by themselves.',
    ...scheduler,
    notes: ['This page sees the secret and the worker accounts, not the clock. The clock is the "Scheduler" workflow on GitHub, which needs the same secret and this site\'s address (runbook 7.5).'],
  });

  const media = fromNames(env, ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']);
  list.push({
    id: 'media', name: 'Lesson media storage (Cloudflare R2)',
    without: 'Teachers cannot upload lesson video or audio, and learners cannot play or save it.',
    ...media, notes: [],
  });

  const chosen = (env.PAYMENT_PROVIDER ?? '').trim();
  for (const p of PAYMENT_PROVIDERS) {
    const any = Object.keys(env).some((name) => name.startsWith(p.prefix) && has(env, name));
    list.push({
      id: `payment_${p.id}`, name: `Payments: ${p.name}`,
      without: 'Nobody can pay through this provider.',
      state: any ? 'partly' : 'not_connected',
      missing: any ? [] : p.names,
      notes: [
        ...(any ? ['Variables for this provider are set. This page does not check that they are complete: a first payment in the provider\'s sandbox does.'] : []),
        ...(chosen === p.id ? ['PAYMENT_PROVIDER names this one as the provider in use.'] : []),
      ],
    });
  }

  const translate = fromNames(env, ['GOOGLE_TRANSLATE_API_KEY']);
  list.push({
    id: 'translate', name: 'The translate button (Google Cloud Translation)',
    without: 'The translate button has no translator to ask.',
    ...translate, notes: [],
  });

  return list;
}

/**
 * What this page cannot see, because it is set in somebody else's dashboard.
 * Each is a step the owner does once, in the place named.
 */
export const UNSEEN_CONNECTIONS: Array<{ name: string; where: string; why: string }> = [
  { name: 'The domain and its DNS records', where: 'the domain\'s registrar or DNS host',
    why: 'The site\'s address, and the three records (SPF, DKIM, DMARC) that let Resend send as the domain. Until the domain is owned, the site runs at the address the host gives it and no email is sent.' },
  { name: 'Sign-in emails (confirmation, password reset)', where: 'Supabase → Authentication → Emails → SMTP settings',
    why: 'Supabase sends these itself, not this application. Without the project\'s own SMTP they are sent by Supabase\'s built-in sender, which is meant for trying things out, not for the public. The Resend account gives the SMTP details.' },
  { name: 'The switches', where: '/admin (the flag dashboard)',
    why: 'Connecting an account switches nothing on. Email delivery, notifications, the boards and child logins each have a switch that stays off until the owner turns it.' },
  { name: 'Google sign-in', where: 'Google Cloud console and Supabase → Authentication → Providers',
    why: 'Off. Needs a Google Cloud project and its client ID and secret entered at Supabase.' },
];

export function connectionSummary(list: Connection[]): { connected: number; partly: number; notConnected: number } {
  return {
    connected: list.filter((c) => c.state === 'connected').length,
    partly: list.filter((c) => c.state === 'partly').length,
    notConnected: list.filter((c) => c.state === 'not_connected').length,
  };
}
