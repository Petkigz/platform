import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { translator } from '@/lib/i18n';
import { SEAT_NOTICE, SEAT_PAYMENT_NOTICE, parseMySeats, seatsHeadline } from '@/lib/seats';
import { READ_FAILED, readerLanguage } from '../reader';
import { SeatDesk } from './seats-desk';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('inst.seatsTitle') };
}

/**
 * The seats an institution bought, and the codes it hands out.
 *
 * Administrators only, decided by `my_institution_seats()` in SQL rather than by
 * this page: an ordinary member gets an empty order list and the page says so.
 * The screen is here rather than folded into `/institution` because a principal
 * needs it at the start of a term, not every day — and because a code block and a
 * monthly report do not belong on the same page.
 *
 * **What a member meets is in their language**: the page's name, that only
 * administrators see what was bought, where a code is used, and that codes are
 * switched off. What an administrator works with (the orders, issuing and
 * withdrawing codes) is drawn for an administrator only, in English for now,
 * inside a block marked as English, under a sentence that says so.
 *
 * **Unread is said, never drawn as "not in an institution" or "bought
 * nothing".** A reply that is an error, or that does not say whether this
 * account has joined, used to send the reader to `/institution` as though they
 * had not joined, and the database's own text was printed under the heading.
 *
 * **A member is not told "has not bought any seats".** The database gives a
 * member an empty list whatever was bought; the count is drawn for an
 * administrator only.
 */
export default async function InstitutionSeatsPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution/seats');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const english = shown.code === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };

  const read = await supabase.rpc('my_institution_seats').then((r) => r, () => READ_FAILED);
  const said = read.data as { joined?: unknown; isAdmin?: unknown } | null;
  const answered = !read.error && said !== null && typeof said === 'object' && typeof said.joined === 'boolean';
  // An administrator's reply without its orders is not an institution that bought nothing.
  const whole = answered && (said.isAdmin !== true || Array.isArray((said as { orders?: unknown }).orders));
  const seats = whole ? parseMySeats(said) : null;
  if (!seats) {
    console.error('institution: what was bought could not be read:', read.error?.message ?? 'a reply that does not say whether this account has joined, or lacks its orders');
  }

  if (seats && !seats.joined) redirect('/institution');

  return (
    <div className="page wide inst-page" {...frame}>
      <nav className="crumbs">
        <Link href="/account">{t('learn.account')}</Link>
        <span aria-hidden>›</span>
        <Link href="/institution">{t('inst.title')}</Link>
        <span aria-hidden>›</span>
        <span>{t('inst.seatsTitle')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('inst.seatsTitle')}</h1>
      </div>

      {!seats ? (
        <div className="notice error" role="alert" data-seats-state="unread">
          {t('inst.seatsUnread')}
        </div>
      ) : (
        <>
          {!seats.enabled && (
            <div className="notice warn" role="status" data-seats-off>
              {t('inst.seatsOff')}
            </div>
          )}

          {!seats.isAdmin ? (
            <section className="card inst-card" data-seats-state="member">
              <h2>{t('inst.seatsMemberTitle')}</h2>
              <p className="muted">
                {t('inst.seatsMemberBody')} <Link href="/institution/claim">{t('inst.useCode')}</Link>
              </p>
            </section>
          ) : (
            <>
              {shown.code !== 'en' && <p className="muted inst-english">{t('inst.adminEnglish')}</p>}
              <div className="inst-admin seats-admin" data-inst-admin data-seats-state="admin" {...english}>
                <p className="muted">{seatsHeadline(seats)}</p>
                <p className="muted" style={{ maxWidth: '48rem' }}>
                  {SEAT_NOTICE}
                </p>

                <SeatDesk orders={seats.orders} />

                <section className="card" style={{ maxWidth: '48rem', marginTop: '1.5rem' }}>
                  <h2 style={{ marginTop: 0 }}>How a school buys seats</h2>
                  <p className="muted" style={{ marginBottom: '0.5rem' }}>
                    {SEAT_PAYMENT_NOTICE}
                  </p>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    To buy seats, write to{' '}
                    <a href="mailto:privacy@ayahspring.com">privacy@ayahspring.com</a> with the course, how
                    many learners and how the school will pay. The owner records the order against the
                    invoice reference, and it appears on this page.
                  </p>
                </section>
              </div>
            </>
          )}
        </>
      )}

      <p className="inst-code">
        <Link href="/institution">{t('inst.yours')}</Link>
      </p>
    </div>
  );
}
