import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, formatDay, formatNumber, languageShownFor, translator } from '@/lib/i18n';
import { fetchSavedCourses } from '@/lib/wishlist';
import { SAVED_MAX, savedStateOf, type SavedState, type SavedWords } from '@/lib/wishlist-shared';
import { SavedItem } from './saved-item';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'saved') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('learn.saved') };
}

/**
 * The saved list.
 *
 * Rendered whether or not `learning.wishlist` is on. Turning a feature off
 * should not confiscate what people put in it while it was on: the database
 * lets a saved row be removed with the flag off, so this page has to keep
 * working too, and says plainly that saving new courses has stopped.
 *
 * (It said until 2026-11-27 that a saved row could still be *edited* with the
 * switch off. It cannot: `guard_course_wishlist()` refuses everything but a
 * removal then, and so does the route. The notice now says what is true and the
 * button for changing a note is not drawn while the switch is off.)
 *
 * A switch that could not be read is not a switch that is off: then the notice
 * is not shown at all, and the row offers what it would with the switch on.
 * The list itself is not guessed at either: a read that fails throws, and the
 * reader gets the site's error page rather than "Nothing saved yet".
 *
 * There is no `where user_id = me` here. Row level security decides whose rows
 * come back, and a filter would only hide a policy mistake instead of exposing
 * it — the same contract `/learn` is held to.
 *
 * **In the reader's language** since 2026-11-27 (`messages/saved.ts`). The row
 * runs in the browser and the catalogue for this page stays on the server, so
 * the row is handed its words, its badge and its day already said.
 */
export default async function SavedPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/saved');

  const [{ locale, shown }, open, saved] = await Promise.all([
    readerLanguage(),
    isFlagEnabled(supabase, 'learning.wishlist').catch(() => null),
    fetchSavedCourses(supabase, { userId: user.id }),
  ]);
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const words: SavedWords = {
    remove: t('saved.remove'),
    noNote: t('saved.noNote'),
    noteEdit: t('cparts.noteEdit'),
    noteAdd: t('cparts.noteAdd'),
    noteLabel: t('cparts.noteLabel'),
    notePlaceholder: t('cparts.notePlaceholder'),
    noteSave: t('cparts.noteSave'),
    cancel: t('action.cancel'),
    removedDone: t('cparts.removedDone'),
    noteSaved: t('cparts.noteSaved'),
    unsure: t('saved.unsure'),
    notePaused: t('saved.notePaused'),
    limit: t('cparts.errSaveLimit', { count: formatNumber(shown.code, SAVED_MAX) }),
    gone: t('cparts.errSaveGone'),
  };
  const STATE: Record<Exclude<SavedState, 'enrolledFor'>, string> = {
    enrolledYou: t('saved.enrolledYou'),
    enrolledFamily: t('saved.enrolledFamily'),
    retired: t('saved.retired'),
    unpublished: t('saved.unpublished'),
    available: t('saved.available'),
  };

  return (
    <div className="page" {...frame}>
      <nav className="crumbs">
        <Link href="/learn">{t('nav.learn')}</Link>
        <span aria-hidden>›</span>
        <span>{t('saved.crumb')}</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">{t('saved.eyebrow')}</p>
        <h1>{t('learn.saved')}</h1>
        <p className="muted">{t('saved.lede')}</p>
      </div>

      {open === false && <div className="notice warn">{t('saved.paused')}</div>}

      {saved.length === 0 ? (
        <div className="card">
          <p className="empty">{t('saved.empty')}</p>
          <Link href="/catalogue" className="btn">
            {t('home.browse')}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {saved.map((s) => {
            const state = savedStateOf(s);
            return (
              <SavedItem
                key={s.id}
                saved={s}
                title={s.courseKnown ? s.courseTitle : t('saved.gone')}
                state={state === 'enrolledFor' ? t('saved.enrolledFor', { name: s.enrolledAs ?? '' }) : STATE[state]}
                savedOn={t('saved.on', { date: formatDay(shown.code, s.savedAt) })}
                canEditNote={open !== false}
                words={words}
              />
            );
          })}
        </div>
      )}

      <p className="muted" style={{ fontSize: '.85rem' }}>
        {t('saved.foot')}
      </p>
    </div>
  );
}
