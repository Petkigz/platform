import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  LOCALE_COOKIE,
  chooseLocale,
  formatDateTime,
  languageShownFor,
  translator,
  type MessageKey,
} from '@/lib/i18n';
import { parseApplicationBoard, parseSponsorBoard } from '@/lib/sponsorship';
import {
  amountOf,
  askStateOf,
  pledgeStateOf,
  staffNoteOf,
  switchOf,
  type AskState,
  type PledgeState,
} from '@/lib/sponsorship-outcome';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'sponsor');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('account.sponsorHeading') };
}

const ASK: Record<AskState, MessageKey> = {
  submitted: 'sponsor.apSubmitted',
  approved: 'sponsor.apApproved',
  funded: 'sponsor.apFunded',
  declined: 'sponsor.apDeclined',
  withdrawn: 'sponsor.apWithdrawn',
  other: 'refer.rwOther',
};

const PLEDGE: Record<PledgeState, MessageKey> = {
  pledged: 'sponsor.spPledged',
  paid: 'sponsor.spPaid',
  withdrawn: 'sponsor.spWithdrawn',
  other: 'refer.rwOther',
};

/** What happens next for a pledge. A state this page does not know gets no sentence. */
const NEXT: Partial<Record<PledgeState, MessageKey>> = {
  pledged: 'sponsor.nextPledged',
  paid: 'sponsor.nextPaid',
  withdrawn: 'sponsor.nextWithdrawn',
};

const line = { margin: '0.25rem 0 0' } as const;

/**
 * Both seats on one page, in the reader's language.
 *
 * A person can be on either side of this at different times — asking for a
 * child's course in one month, paying for a stranger's the next — and hunting
 * for a second page to see the other half would be a strange thing to ask of
 * them. The two halves are read by separate functions and never joined: the
 * applications board has no donor field, and the sponsorship board has no
 * learner field.
 *
 * **This page only reads.** There is no button on it and no route behind it.
 *
 * **A state is said from the catalogue.** One this page has no word for is
 * "Recorded"; the database's word is never printed.
 *
 * **An amount is a currency code and major units**, set left to right. It
 * used to be printed as stored, in minor units. One that cannot be read as an
 * amount is left out.
 *
 * **What staff wrote is theirs.** It is printed apart, untranslated, in
 * whatever direction it was written, under a line saying whose words it is.
 *
 * **A pledge is not a payment.** No sentence says this page can take one, and
 * none says how to pay: nothing in the product does yet.
 *
 * **Every time is said with its zone.** This is drawn on a server.
 *
 * **The switch off stops asking and sponsoring, not reading.** What was asked
 * for or sponsored earlier is still listed, and the two links to pages where
 * something new could be started are not drawn.
 *
 * **Twenty-seven languages have it** (`messages/sponsor.ts`), unreviewed; a
 * language held for review reads it in English, whole, under `lang="en"`.
 */
export default async function AccountSponsorshipPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/sponsorship');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const when = (iso: string | null) => (iso ? formatDateTime(shown.code, iso, 'UTC') : '');
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const [asked, gave] = await Promise.all([
    supabase.rpc('my_sponsorship_applications'),
    supabase.rpc('my_sponsorships'),
  ]);

  const applied = asked.error ? null : parseApplicationBoard(asked.data);
  const sponsored = gave.error ? null : parseSponsorBoard(gave.data);
  const enabled = switchOf(applied, sponsored);

  const title = (name: string | null, slug: string | null) => {
    const words = name ? <bdi>{name}</bdi> : t('sponsor.aCourse');
    return (
      <strong style={{ overflowWrap: 'anywhere' }}>
        {slug ? <Link href={`/courses/${slug}`}>{words}</Link> : words}
      </strong>
    );
  };

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/account">{t('merge.back')}</Link>
      </p>
      <h1>{t('account.sponsorHeading')}</h1>
      <p className="lede">{t('sponsor.lede')}</p>

      {enabled === false && <div className="notice warn">{t('sponsor.off')}</div>}

      <div className="stack" style={{ gap: '1rem' }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('sponsor.askedHeading')}</h2>

          {!applied && (
            <div className="notice error" role="alert">
              {t('sponsor.askedUnread')}
            </div>
          )}

          {applied && applied.applications.length === 0 && (
            <p className="empty">
              {enabled ? `${t('sponsor.askedNone')} ${t('sponsor.askedHow')}` : t('sponsor.askedNone')}
            </p>
          )}

          {applied && applied.applications.length > 0 && (
            <ul className="lessons stacked">
              {applied.applications.map((row, index) => {
                const note = staffNoteOf(row.decisionReason);
                const askedOn = when(row.askedAt);
                const decidedOn = when(row.decidedAt);
                return (
                  <li key={row.id || index} data-ask={askStateOf(row.status)}>
                    {title(row.courseTitle, row.courseSlug)}
                    <p className="meta" style={line}>
                      {t(ASK[askStateOf(row.status)])}
                    </p>
                    {row.learnerName && (
                      <p className="meta" style={line}>
                        <Say text={t('sponsor.forWhom')} parts={{ name: <bdi>{row.learnerName}</bdi> }} />
                      </p>
                    )}
                    {row.seatCode && (
                      <p className="meta" style={line}>
                        <Say text={t('sponsor.seat')} parts={{ code: <bdi dir="ltr">{row.seatCode}</bdi> }} />
                      </p>
                    )}
                    {askedOn !== '' && (
                      <p className="muted" style={line}>
                        {t('sponsor.askedOn', { date: askedOn })}
                      </p>
                    )}
                    {decidedOn !== '' && (
                      <p className="muted" style={line}>
                        {t('sponsor.decidedOn', { date: decidedOn })}
                      </p>
                    )}
                    {note && (
                      <>
                        <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                          {t('sponsor.staffNote')}
                        </p>
                        {/* Their words, in their language and direction: not this page's. */}
                        <p
                          dir="auto"
                          data-staff-note
                          style={{
                            margin: '0.25rem 0 0',
                            paddingInlineStart: '0.75rem',
                            borderInlineStart: '2px solid var(--border)',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {note}
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {applied && applied.applications.some((row) => askStateOf(row.status) === 'funded') && (
            <div className="notice" style={{ marginTop: '1rem' }}>
              <strong>{t('sponsor.coveredLead')}</strong> {t('sponsor.coveredBody')}{' '}
              <Link href="/learn">{t('account.selfGo')}</Link>
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t('sponsor.gaveHeading')}</h2>

          {!sponsored && (
            <div className="notice error" role="alert">
              {t('sponsor.gaveUnread')}
            </div>
          )}

          {sponsored && sponsored.sponsorships.length === 0 && (
            <p className="empty">
              {enabled ? `${t('sponsor.gaveNone')} ${t('sponsor.gaveHow')}` : t('sponsor.gaveNone')}
            </p>
          )}

          {sponsored && sponsored.sponsorships.length > 0 && (
            <ul className="lessons stacked">
              {sponsored.sponsorships.map((row, index) => {
                const state = pledgeStateOf(row.status);
                const amount = amountOf(row.amountMinor, row.currencyCode);
                const next = NEXT[state];
                const pledgedOn = when(row.pledgedAt);
                const recordedOn = state === 'paid' ? when(row.recordedAt) : '';
                return (
                  <li key={row.id || index} data-pledge={state}>
                    {title(row.courseTitle, row.courseSlug)}
                    <p className="meta" style={line}>
                      {t(PLEDGE[state])}
                    </p>
                    {row.seatCode && (
                      <p className="meta" style={line}>
                        <Say text={t('sponsor.seat')} parts={{ code: <bdi dir="ltr">{row.seatCode}</bdi> }} />
                      </p>
                    )}
                    {amount && (
                      <p className="meta" style={line}>
                        <Say text={t('sponsor.amount')} parts={{ amount: <bdi dir="ltr">{amount}</bdi> }} />
                      </p>
                    )}
                    {row.reference && (
                      <p className="meta" style={{ ...line, overflowWrap: 'anywhere' }}>
                        <Say
                          text={t('sponsor.reference')}
                          parts={{ reference: <bdi dir="ltr">{row.reference}</bdi> }}
                        />
                      </p>
                    )}
                    {pledgedOn !== '' && (
                      <p className="muted" style={line}>
                        {t('sponsor.pledgedOn', { date: pledgedOn })}
                      </p>
                    )}
                    {recordedOn !== '' && (
                      <p className="muted" style={line}>
                        {t('sponsor.recordedOn', { date: recordedOn })}
                      </p>
                    )}
                    {next && (
                      <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                        {t(next)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        {t('sponsor.zakat')}
      </p>

      {/* Where something new is started. Not drawn while the switch is known to be off. */}
      {enabled !== false && (
        <div className="page-actions" style={{ marginTop: '1rem' }}>
          <Link href="/sponsor" className="btn secondary">
            {t('account.sponsorWaiting')}
          </Link>
          <Link href="/sponsor/apply" className="btn secondary">
            {t('sponsor.askLink')}
          </Link>
        </div>
      )}
    </div>
  );
}
