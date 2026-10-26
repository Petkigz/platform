import type { MetadataRoute } from 'next';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { buildSitemap, GATED_ROUTES, type SitemapEntry } from '@/lib/crawl';
import { siteOrigin } from '@/lib/site';

/**
 * `sitemap.xml`.
 *
 * The static public pages always; then whatever is genuinely published right
 * now — courses from the same function the catalogue pages with, and teacher
 * pages only while `teaching.public_profile` is on and the profile is
 * published, because the row-level policy already refuses everything else.
 *
 * **It degrades rather than fails.** No configured origin, no Supabase, a
 * timeout, a function that has moved — each of those produces the static list,
 * or an empty sitemap, instead of a 500. A sitemap that throws is worse than a
 * short one: a crawler that gets an error gives up on the whole file.
 *
 * Courses are read in pages of a hundred because that is `catalogue_page()`'s
 * ceiling, and the loop stops at Google's per-file limit rather than at the
 * end of the catalogue. A second file would be a `sitemap index`, which is
 * not needed by a shelf that holds five courses and would be dead weight to
 * maintain before it holds five thousand.
 */
export const dynamic = 'force-dynamic';

const PER_FILE = 5_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];

  const { dynamic, enabledFlags } = await publishedPages();

  return buildSitemap(origin, { dynamic, enabledFlags }).map((entry) => toRoute(entry));
}

function toRoute(entry: SitemapEntry): MetadataRoute.Sitemap[number] {
  return {
    url: entry.url,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
  };
}

async function publishedPages(): Promise<{
  dynamic: { path: string }[];
  enabledFlags: Set<string>;
}> {
  const enabledFlags = new Set<string>();
  const dynamic: { path: string }[] = [];

  if (!isSupabaseConfigured()) return { dynamic, enabledFlags };

  try {
    const supabase = await createClient();

    // Which optional pages exist right now. Read once, before anything is
    // published into the file, so the answer cannot change halfway through.
    await Promise.all(
      GATED_ROUTES.map(async ({ flag }) => {
        const on = await isFlagEnabled(supabase, flag).catch(() => false);
        if (on) enabledFlags.add(flag);
      }),
    );

    // Courses: the slug, which is what the route takes.
    for (let offset = 0; offset < PER_FILE; offset += 100) {
      const { data, error } = await supabase.rpc('catalogue_page', {
        p_query: null,
        p_subject: null,
        p_audience: null,
        p_band: null,
        p_limit: 100,
        p_offset: offset,
      });
      if (error) break;

      const ids = readOrderedIds(data);
      if (ids.length === 0) break;

      const { data: rows } = await supabase.from('courses').select('id, slug').in('id', ids);
      const byId = new Map((rows ?? []).map((row) => [row.id as string, row.slug as string]));
      for (const id of ids) {
        const slug = byId.get(id);
        if (slug) dynamic.push({ path: `/courses/${encodeURIComponent(slug)}` });
      }

      if (ids.length < 100) break;
    }

    // Teacher pages, only while the switch that makes them public is on. The
    // query would return nothing anyway — the read policy checks the same
    // setting — but asking twice is cheaper than a sitemap full of 404s if that
    // policy ever changes shape.
    const profilesOn = await isFlagEnabled(supabase, 'teaching.public_profile').catch(() => false);
    if (profilesOn) {
      const { data } = await supabase
        .from('instructor_public_profiles')
        .select('slug')
        .eq('status', 'published')
        .limit(1_000);

      for (const row of data ?? []) {
        if (typeof row.slug === 'string') dynamic.push({ path: `/teachers/${encodeURIComponent(row.slug)}` });
      }
    }
  } catch {
    // Partial is fine; the static pages are still worth publishing.
  }

  return { dynamic, enabledFlags };
}

/** The ids in a `catalogue_page()` envelope, defensively. */
function readOrderedIds(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const ordered = (value as { ordered?: unknown }).ordered;
  if (!Array.isArray(ordered)) return [];

  return ordered
    .map((hit) =>
      hit && typeof hit === 'object' && typeof (hit as { courseId?: unknown }).courseId === 'string'
        ? (hit as { courseId: string }).courseId
        : null,
    )
    .filter((id): id is string => id !== null);
}
