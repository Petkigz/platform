import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { one } from '@/lib/embed';
import { translator } from '@/lib/i18n';
import { audienceName, readerLanguage } from './reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('paths.title') };
}

/**
 * Learning paths: a chosen sequence of courses.
 *
 * **In the reader's language** since 2026-11-27 (`messages/paths.ts`). A
 * path's title and description are its author's and are shown as written.
 * There is no link inside a sentence: the notice for a switched-off page used
 * to carry its link to the catalogue in the middle of its words; the link now
 * follows it.
 *
 * Neither read is guessed at: a switch or a list that could not be read
 * throws, and the reader gets the site's error page rather than "No learning
 * paths are published yet".
 */
export default async function LearningPathsPage() {
  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  if (!isSupabaseConfigured()) {
    return (
      <div className="container section" {...frame}>
        <h1>{t('paths.title')}</h1>
        <p className="notice warn">{t('paths.unconnected')}</p>
      </div>
    );
  }
  const supabase = await createClient();
  const enabled = await isFlagEnabled(supabase, 'learning.paths');
  if (!enabled) {
    return (
      <div className="container section" {...frame}>
        <p className="eyebrow">{t('paths.eyebrow')}</p>
        <h1>{t('paths.title')}</h1>
        <p className="notice">{t('paths.off')}</p>
        <p>
          <Link href="/catalogue">{t('home.browse')}</Link>
        </p>
      </div>
    );
  }
  const { data, error } = await supabase
    .from('learning_paths')
    .select(`
    id,title,slug,description,audience,
    learning_path_items(id,position,required,courses(id,title,slug,description,status))
  `)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('title');
  if (error) throw new Error(error.message);
  const paths = data ?? [];

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">{t('paths.eyebrow')}</p>
      <h1>{t('paths.title')}</h1>
      <p className="lede">{t('paths.lede')}</p>
      {paths.length === 0 ? (
        <p className="empty">{t('paths.none')}</p>
      ) : (
        <div className="grid cols-2">
          {paths.map((path) => (
            <article className="card" key={path.id}>
              <p className="eyebrow">{audienceName(t, path.audience)}</p>
              <h2>
                <Link href={`/paths/${path.slug}`} dir="auto">{path.title}</Link>
              </h2>
              {path.description && <p className="muted" dir="auto">{path.description}</p>}
              <ol>
                {[...(path.learning_path_items ?? [])]
                  .sort((a, b) => a.position - b.position)
                  .map((item) => {
                    const course = one(item.courses);
                    return (
                      <li key={item.id}>
                        {course?.status === 'active' ? (
                          <Link href={`/courses/${course.slug}`} dir="auto">{course.title}</Link>
                        ) : course ? (
                          <span dir="auto">{course.title}</span>
                        ) : (
                          t('paths.courseGone')
                        )}
                        {!item.required && (
                          <span className="badge neutral" style={{ marginInlineStart: '.5rem' }}>
                            {t('paths.optional')}
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ol>
              <Link className="btn secondary" href={`/paths/${path.slug}`}>
                {t('paths.view')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
