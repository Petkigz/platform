-- Email can now leave the building, for nothing.
--
-- The outbox was the honest half of a delivery system: a message was rendered,
-- queued, claimed, backed off, dead-lettered and suppressed by rules enforced in
-- the database, and the constraint refused to call anything `sent` without a
-- provider's own reference. The missing half was one HTTP call, and the reason it
-- was missing was honest too — no provider, no credential.
--
-- On 2026-10-28 the owner named the constraint that settles it: nothing may be
-- built that requires paying a platform yet. So the provider is the one whose
-- free tier is real and permanent rather than a trial — **Resend**, 3,000
-- messages a month and 100 a day at no cost, which is more mail than a platform
-- with no learners can produce and enough for the first few hundred.
--
-- What that means for this flag:
--
--   * The dispatcher exists now (`web/src/lib/email/`), so "no provider" is a
--     configuration state rather than a missing feature.
--   * The provider is still not chosen by this migration and no credential is
--     committed. `RESEND_API_KEY` is read at runtime; until it is set the
--     dispatcher claims **nothing at all**, because claiming is what starts the
--     attempt counter and a run with no key would burn every message's five
--     attempts against a 401 and dead-letter the entire outbox in one pass.
--   * The free tier has a daily cap of 100 messages. That is a real limit and
--     it is stated here rather than discovered on a busy day: past it, sends
--     fail, they retry on the backoff, and they dead-letter for a person to
--     release — nothing is lost, but nothing is delivered either.
--
-- What is still the owner's: verifying the sending domain (three DNS records,
-- free), and pointing a scheduler at the cron route (free). Both are things to
-- do, not things to buy.

update public.platform_settings
   set preconditions = '**Built 2026-10-28: the dispatcher, against a provider with '
        || 'a real free tier.** The database half existed — claim, lease, backoff, '
        || 'dead letter, suppression — and the one HTTP call in the middle now '
        || 'exists in web/src/lib/email: claim, send through Resend, settle with the '
        || 'provider''s own reference, and never call a message sent without one. A '
        || 'refusal that names the recipient suppresses the address; our own bad '
        || 'credentials never do, because the address is fine and suppressing it '
        || 'would cut a parent off from every future receipt. Set-up, all of it free: '
        || 'RESEND_API_KEY (3,000 messages a month, 100 a day, no card), EMAIL_FROM, '
        || 'the sending domain''s three DNS records, and a scheduler calling the cron '
        || 'route with CRON_SECRET and a worker account — the worker signs in as '
        || 'staff because the database only lets a privileged person claim or settle '
        || 'a message, so every send is attributable. Until the key is set nothing is '
        || 'claimed at all. The daily cap is the one thing that bites: past 100 in a '
        || 'day, sends retry and then dead-letter for a person to release',
       description = 'Email / push / SMS'
 where key = 'delivery.notifications';

update public.platform_settings
   set preconditions = '**Deliverability is the part a provider does not do for you, and it '
        || 'starts free.** A sending domain needs SPF and DKIM (Resend generates both; '
        || 'they are DNS records, not fees) and a DMARC record that starts at p=none '
        || 'and tightens once the reports are read. Nothing in this repository can '
        || 'set DNS, so this stays a set-up step: add the records, send one message, '
        || 'read the authentication result in the provider''s log, and only then turn '
        || 'delivery on. Until then, password resets and receipts land in spam, which '
        || 'is indistinguishable from not sending them',
       description = 'SPF / DKIM / DMARC and deliverability'
 where key = 'platform.email_auth';
