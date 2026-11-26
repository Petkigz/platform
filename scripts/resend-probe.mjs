// Whether the email provider is set up, asked of the provider itself, before
// any application is deployed.
//
// Everything else that touches `web/src/lib/email/provider.ts` is a stand-in
// typed from Resend's documentation. This is not. It needs what only the
// owner can make at https://resend.com: an account, a sender domain with its
// DNS records, and an API key. Then either
//
//     RESEND_API_KEY=re_... EMAIL_FROM=no-reply@your-domain \
//       RESEND_PROBE_TO=you@example.com \
//       node --experimental-strip-types scripts/resend-probe.mjs
//
// or save `RESEND_API_KEY` and `RESEND_PROBE_TO` as repository secrets and
// `EMAIL_FROM` as a repository variable; the workflow "Resend probe" then
// runs on a commit whose message begins "test: resend probe".
//
// What it does, in order, and stops at the first thing that is not ready:
//
//   1. reads the settings the way the application does
//      (`resolveEmailProvider()`), so a sender the application would refuse
//      is refused here;
//   2. asks Resend for the sender's domain and each of its DNS records
//      (`GET /domains`, `GET /domains/:id`). A key that may only send cannot
//      be asked this; that is said, and it goes on;
//   3. looks up the domain's DMARC record in public DNS. Resend does not
//      check it and mailbox providers do;
//   4. **only if `RESEND_PROBE_TO` is set**, sends ONE message to that one
//      address through the application's own sender (`sendWithResend()`), and
//      says what the application would have recorded: sent with the
//      provider's reference, or why not;
//   5. where the key allows it, asks what became of that message
//      (`GET /emails/:id`) for up to a minute.
//
// Without `RESEND_PROBE_TO` nothing is sent to anybody.
//
// What it cannot show: that a message reaches an inbox and not a spam folder
// (read the message's headers for that), the application's scheduler, the
// database's side of delivery, or anything about a deployment.
//
// The key is never printed, and an address is printed only as its first
// letter and its domain. Exit code 0 only if the sender is ready for the
// application: the key works, the domain is verified, and, when a message
// was asked for, the provider took it.
import { setTimeout as wait } from 'node:timers/promises';
import { resolveTxt } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import { resolveEmailProvider, sendWithResend } from '../web/src/lib/email/provider.ts';

const API = 'https://api.resend.com';
const ADDRESS = /[^\s@<>()"']+@[^\s@<>()"']+\.[^\s@<>()"']+/g;

/** `p***@example.com`: enough to know which address, not enough to write to it. */
export function maskAddress(address) {
  const [local, domain] = String(address).split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

/** A provider's sentence with every address in it masked. One line, at most 300 characters. */
export function maskText(text) {
  return String(text ?? '').replace(ADDRESS, (found) => maskAddress(found)).split('\n')[0].slice(0, 300);
}

/** The domain of a sender, from `a@b` or `Name <a@b>`; null when there is none. */
export function senderDomain(from) {
  const found = /@([a-z0-9.-]+\.[a-z]{2,})\s*>?\s*$/i.exec(String(from ?? '').trim());
  return found ? found[1].toLowerCase() : null;
}

const isAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function ask(fetchImpl, key, path) {
  try {
    const response = await fetchImpl(`${API}${path}`, {
      method: 'GET',
      headers: { authorization: `Bearer ${key}`, accept: 'application/json', 'user-agent': 'ayahspring-resend-probe' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    return { status: response.status, body };
  } catch {
    // The thrown text can name hosts and proxies; it is not passed on.
    return { status: 0, body: null };
  }
}

const errorOf = (answer) => ({
  name: typeof answer.body?.name === 'string' ? answer.body.name : '',
  message: maskText(typeof answer.body?.message === 'string' ? answer.body.message : ''),
});

/**
 * What Resend says about the sender's domain.
 * `state`: verified | not_ready | missing | unreadable | key_refused | unreachable.
 */
export async function readDomain(fetchImpl, key, domain) {
  const list = await ask(fetchImpl, key, '/domains');
  if (list.status === 0) return { state: 'unreachable', lines: ['Resend could not be reached to read the domain.'] };
  if (list.status !== 200) {
    const error = errorOf(list);
    if (error.name === 'restricted_api_key' && /only send/i.test(error.message)) {
      return { state: 'unreadable', lines: ['This key may only send, so Resend will not say how the domain stands. That is the right kind of key for the application; the domain is judged by the send below.'] };
    }
    return { state: 'key_refused', lines: [`Resend refused the key (${list.status}${error.name ? ` ${error.name}` : ''}): ${error.message || 'no reason given'}`] };
  }
  const domains = Array.isArray(list.body?.data) ? list.body.data : [];
  const mine = domains.find((d) => typeof d?.name === 'string' && d.name.toLowerCase() === domain);
  if (!mine) {
    const names = domains.map((d) => d?.name).filter((n) => typeof n === 'string');
    return { state: 'missing', lines: [`${domain} is not among this account's domains (${names.length ? names.join(', ') : 'it has none'}). Add it at resend.com/domains, or set EMAIL_FROM to an address on a domain that is there.`] };
  }
  const lines = [`${domain}: Resend says "${mine.status}"${mine.region ? `, region ${mine.region}` : ''}.`];
  const detail = await ask(fetchImpl, key, `/domains/${encodeURIComponent(mine.id)}`);
  const records = Array.isArray(detail.body?.records) ? detail.body.records : [];
  for (const record of records) {
    lines.push(`  ${record.record} ${record.type} ${record.name}: ${record.status}`);
  }
  if (detail.status === 200 && records.length === 0) lines.push('  Resend listed no DNS records for it.');
  return { state: mine.status === 'verified' ? 'verified' : 'not_ready', status: mine.status, lines };
}

/** The DMARC record in public DNS, which Resend does not look at. Never fails the probe. */
export async function readDmarc(resolve, domain) {
  try {
    const found = (await resolve(`_dmarc.${domain}`)).map((parts) => parts.join('')).filter((text) => /^v=DMARC1/i.test(text.trim()));
    if (found.length === 0) return `_dmarc.${domain}: a TXT record is there and none of it is a DMARC record.`;
    if (found.length > 1) return `_dmarc.${domain}: ${found.length} DMARC records. There must be exactly one; receivers ignore all of them otherwise.`;
    const policy = /;\s*p\s*=\s*([a-z]+)/i.exec(found[0])?.[1]?.toLowerCase() ?? 'not stated';
    return `_dmarc.${domain}: one DMARC record, policy "${policy}".`;
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : '';
    if (code === 'ENOTFOUND' || code === 'ENODATA') return `_dmarc.${domain}: no DMARC record. Add a TXT record there starting "v=DMARC1; p=none"; Gmail and Yahoo expect one.`;
    return `_dmarc.${domain}: could not be looked up from here (${code || 'no code'}).`;
  }
}

const SUBJECT = 'AyahSpring: email is set up';
const bodyFor = (from) => `This is a test from AyahSpring's set-up check.\n\nIf you are reading it, the email provider accepted a message from ${from} and delivered it. Nothing else was sent, to you or to anybody.`;

/**
 * The whole check. `env` as the application reads it, plus RESEND_PROBE_TO.
 * Returns `{ ok, sent, lines }`; `lines` is everything that may be printed.
 */
export async function probe({ env, fetchImpl = fetch, resolve = resolveTxt, pause = wait, waits = 12 }) {
  const lines = [];
  const say = (line) => { lines.push(line); };
  const done = (ok, sent = false) => ({ ok, sent, lines });

  const provider = resolveEmailProvider(env);
  if (provider.kind === 'none') {
    say(`Not ready: ${maskText(provider.reason)}`);
    return done(false);
  }
  const domain = senderDomain(provider.from);
  say(`Sender: ${provider.from}${(env.EMAIL_FROM ?? '').trim() === '' ? ' (EMAIL_FROM is not set; this is the application\'s default)' : ''}.`);
  if (provider.replyTo) say(`Replies go to: ${maskAddress(provider.replyTo)}.`);
  if (!domain) { say('Not ready: the sender has no domain.'); return done(false); }

  const testSender = domain === 'resend.dev';
  let state = { state: 'unreadable', lines: [] };
  if (testSender) {
    say('This is Resend\'s own test sender. It writes only to the address the Resend account was made with, so the application cannot use it: add a domain of your own and set EMAIL_FROM to an address on it.');
  } else {
    state = await readDomain(fetchImpl, provider.apiKey, domain);
    state.lines.forEach(say);
    if (state.state === 'key_refused' || state.state === 'unreachable' || state.state === 'missing') return done(false);
    say(await readDmarc(resolve, domain));
  }

  const to = (env.RESEND_PROBE_TO ?? '').trim();
  if (to === '') {
    say('RESEND_PROBE_TO is not set, so no message was sent.');
    if (state.state === 'verified') { say('Ready as far as can be told without sending: the key works and the domain is verified.'); return done(true); }
    say(state.state === 'not_ready'
      ? 'Not ready: the domain is not verified yet. Add the records above at the DNS host, press Verify in Resend, and run this again.'
      : 'Not known: nothing was sent and the domain could not be read. Set RESEND_PROBE_TO to your own address and run this again.');
    return done(false);
  }
  if (!isAddress(to)) { say('Not sent: RESEND_PROBE_TO is not an address.'); return done(false); }
  if (state.state === 'not_ready') {
    say(`Not sent: Resend would refuse a message from a domain that is "${state.status}". Add the records above at the DNS host, press Verify in Resend, and run this again.`);
    return done(false);
  }

  // The application's own sender, with its answer kept so the reason can be said.
  let seen = { status: 0, name: '', message: '' };
  const recording = async (url, init) => {
    const response = await fetchImpl(url, init);
    try {
      const copy = await response.clone().json();
      seen = { status: response.status, name: typeof copy?.name === 'string' ? copy.name : '', message: maskText(typeof copy?.message === 'string' ? copy.message : '') };
    } catch { seen = { status: response.status, name: '', message: '' }; }
    return response;
  };
  const result = await sendWithResend(provider, { id: 'resend-probe', to, subject: SUBJECT, body: bodyFor(provider.from), templateCode: 'probe', attempts: 0 }, recording);
  if (result.outcome !== 'sent') {
    const why = seen.status === 0 ? 'Resend could not be reached.' : `Resend answered ${seen.status}${seen.name ? ` ${seen.name}` : ''}: ${seen.message || 'no reason given'}`;
    say(`Not sent to ${maskAddress(to)}. ${why}`);
    say(`The application would have recorded this as "${result.outcome}"${result.outcome === 'retry' && result.misconfigured ? ', a fault in the set-up and not in the address' : ''}, and nobody is told a message went.`);
    return done(false);
  }
  say(`Sent ONE message to ${maskAddress(to)}. Resend's reference: ${result.reference}. The application would have recorded it as sent, with that reference.`);
  if (testSender) { say('Not ready for the application: this proves the key and nothing about a sender domain.'); return done(false, true); }

  // What became of it, where the key may ask.
  let last = null;
  for (let i = 0; i < waits; i += 1) {
    await pause(5_000);
    const answer = await ask(fetchImpl, provider.apiKey, `/emails/${encodeURIComponent(result.reference)}`);
    if (answer.status !== 200) {
      say(state.state === 'unreadable'
        ? 'This key may not ask what became of it. Look in the inbox, and in Resend under Emails.'
        : `What became of it could not be read (${answer.status}). Look in the inbox, and in Resend under Emails.`);
      return done(true, true);
    }
    last = typeof answer.body?.last_event === 'string' ? answer.body.last_event : null;
    if (last === 'delivered') { say('Resend says it was delivered to the receiving server. Whether it is in the inbox or in spam only the inbox shows.'); return done(true, true); }
    if (last === 'bounced' || last === 'complained' || last === 'failed' || last === 'canceled') {
      say(`Resend says the message "${last}". The sender is set up; that address did not take it.`);
      return done(false, true);
    }
  }
  say(`Resend took it and had not said "delivered" after ${Math.round((waits * 5) / 60)} minute(s) (last event: ${last ?? 'none'}). Look in the inbox, and in Resend under Emails.`);
  return done(true, true);
}

// On a runner the log cannot always be fetched afterwards, so what was found
// is also left as an annotation on the run. Nothing secret is in it.
const annotate = (level, title, text) => {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const escaped = text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`::${level} title=${title}::${escaped}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await probe({ env: process.env });
  for (const line of result.lines) console.log(line);
  annotate(result.ok ? 'notice' : 'error', result.ok ? 'Resend is ready' : 'Resend is not ready', result.lines.join('\n'));
  if (!result.ok) process.exitCode = 1;
}
