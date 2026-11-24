import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { translator } from '@/lib/i18n';
import { claimLearnersOf } from '@/lib/seat-claim';
import { READ_FAILED, claimWords, readerLanguage } from '../reader';
import { ClaimForm } from './claim-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('inst.claimTitle') };
}

/**
 * Where a school's seat code is turned into a course.
 *
 * Open to anybody signed in — a seat is not reserved for an institution's own
 * members, because a madrasah may well buy seats for children whose families
 * never joined anything. The code is the entitlement; the account is who holds it.
 *
 * **In the reader's language**, the form's refusals included: the person
 * holding a school's letter is a parent, not an administrator.
 *
 * **It says what the school can see and do.** The school is shown which of its
 * codes were used and when, so a school that noted who was given which code
 * knows whose was used; and it can withdraw a used code, which takes the course
 * away. The page used to say "the school is not told which of its codes went to
 * whom", which the first of those makes untrue.
 *
 * The learner list comes from the same RLS-limited read the checkout page uses:
 * the caller's own profile plus the children in families they belong to. The
 * database checks `can_access_learner()` again, so the list is a convenience and
 * not the control. **A list that could not be read is said as that, and no form
 * is drawn**: with no list the form would offer only "myself", and a parent
 * would spend a once-only code on the wrong learner.
 */
export default async function ClaimSeatPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/institution/claim');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const read = await supabase
    .from('learner_profiles')
    .select('id,display_name,learner_type,linked_user_id')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('display_name')
    .then((r) => r, () => READ_FAILED);
  const learners = read.error ? null : claimLearnersOf(read.data, user.id);
  if (!learners) {
    console.error('institution: the learners a code can be used for could not be read:', read.error?.message ?? 'a reply that is not a list of learners');
  }

  return (
    <div className="page narrow inst-page" {...frame}>
      <nav className="crumbs">
        <Link href="/account">{t('learn.account')}</Link>
        <span aria-hidden>›</span>
        <Link href="/institution">{t('inst.title')}</Link>
        <span aria-hidden>›</span>
        <span>{t('inst.claimTitle')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('inst.claimTitle')}</h1>
        <p className="muted">{t('inst.claimLede')}</p>
      </div>

      {learners ? (
        <section className="card inst-card">
          <ClaimForm learners={learners} words={claimWords(t)} />
        </section>
      ) : (
        <div className="notice error" role="alert" data-claim-state="unread">
          {t('inst.claimLearnersUnread')}
        </div>
      )}

      <p className="muted claim-note">{t('inst.claimSchoolSees')}</p>
      <p className="muted claim-note">{t('inst.claimWithdraw')}</p>

      <p className="claim-links">
        <Link href="/learn">{t('nav.learn')}</Link> · <Link href="/catalogue">{t('nav.catalogue')}</Link>
      </p>
    </div>
  );
}
