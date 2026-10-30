import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { isLocaleCode, localeByCode, translator } from '@/lib/i18n';
import { sectionByPrefix } from '@/lib/translations';

/**
 * Take a correction sheet and write it down.
 *
 * The page at `/contribute` is a plain `POST` to here, so this route is the only
 * way a submission enters the building and everything it does not check is a
 * hole. What it checks, in order, and why each one is here rather than in the
 * browser:
 *
 *   * **the flag** — the database refuses too (the insert policy reads the same
 *     setting), but a route that skipped the check would still hand a stranger a
 *     confusing SQL error instead of "this is closed";
 *   * **the language and the section** — against the register and the English
 *     key set, because the form's `<select>` is a suggestion;
 *   * **`current_text`** — taken from the catalogue *here*, never from the
 *     client. A submission that could name its own "current text" could make any
 *     line look like it had been corrected when it had not;
 *   * **`{placeholders}`** — a correction that drops `{count}` is a sentence that
 *     will print with a hole in it, and finding that out on a live page in a
 *     language nobody here reads is not acceptable. Rejected with the key named;
 *   * **one per key, sixty at most** — the unique constraint and the trigger are
 *     the backstop; this is the sentence a person gets instead of a constraint
 *     name;
 *   * **the fields are trimmed and bounded** — because a name of 40 000
 *     characters becomes a heading on `/language`.
 *
 * Nothing here needs a session. The rows it writes are readable by one person,
 * and the id is generated here rather than by `returning`, because `anon` holds
 * insert and no select at all — which is the property that keeps every reviewer's
 * address out of the internet's reach.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/contribute?error=failed', request.url), 303);
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.redirect(new URL('/contribute?error=failed', request.url), 303);
  }

  const supabase = await createClient();

  const open = await isFlagEnabled(supabase, 'platform.translation_reviews').catch(() => false);
  if (!open) {
    return NextResponse.redirect(new URL('/contribute?error=closed', request.url), 303);
  }

  const field = (name: string): string => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };

  const localeCode = field('locale');
  if (!isLocaleCode(localeCode) || localeCode === 'en') {
    return NextResponse.redirect(new URL('/contribute?error=language', request.url), 303);
  }
  const locale = localeByCode(localeCode);

  const section = sectionByPrefix(field('section'));
  if (!section) {
    return NextResponse.redirect(
      new URL(`/contribute?locale=${encodeURIComponent(locale.code)}&error=failed`, request.url),
      303,
    );
  }

  const name = field('name');
  const email = field('email');
  const note = field('note').slice(0, 2000);
  const whole = form.get('scope') === 'whole';

  const back = (code: string) =>
    NextResponse.redirect(
      new URL(
        `/contribute?locale=${encodeURIComponent(locale.code)}&section=${encodeURIComponent(section.prefix)}&error=${code}`,
        request.url,
      ),
      303,
    );

  if (name.length < 2 || name.length > 120) return back('name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return back('email');

  const current = translator(locale.code);
  const placeholders = (value: string) =>
    [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort().join(',');

  const proposals: {
    locale: string;
    message_key: string;
    current_text: string;
    proposed_text: string;
  }[] = [];

  for (const key of section.keys) {
    const proposed = field(`t__${key}`);
    if (!proposed) continue;

    const currentText = current(key);
    // Unchanged lines are not proposals. This is what makes the page usable with
    // every box prefilled: a reviewer edits two lines out of forty and the other
    // thirty-eight are not stored as "no change".
    if (proposed === currentText) continue;
    if (proposed.length > 600) return back('failed');
    if (placeholders(proposed) !== placeholders(currentText)) return back('placeholder');

    proposals.push({
      locale: locale.code,
      message_key: key,
      current_text: currentText,
      proposed_text: proposed,
    });
  }

  if (proposals.length === 0 && !whole) return back('nothing');
  if (proposals.length > 60) return back('failed');

  // Generated here, not by the database: `insert ... returning` needs select, and
  // `anon` deliberately has none.
  const reviewId = crypto.randomUUID();

  const { error: reviewError } = await supabase.from('translation_reviews').insert({
    id: reviewId,
    locale: locale.code,
    reviewer_name: name,
    reviewer_email: email,
    scope: whole ? 'whole' : 'part',
    note: note || null,
  });

  if (reviewError) {
    // A policy refusal here means the flag moved between the check above and the
    // write, or the shape check caught something this route did not. Either way
    // nothing was saved and the reader is told so rather than thanked.
    return NextResponse.redirect(new URL('/contribute?error=failed', request.url), 303);
  }

  if (proposals.length > 0) {
    const { error: proposalError } = await supabase
      .from('translation_proposals')
      .insert(proposals.map((p) => ({ ...p, review_id: reviewId })));

    if (proposalError) {
      // The review row exists but its corrections do not. That is a half-written
      // submission, and leaving it would put a review with no corrections in
      // front of the owner as if the reviewer had found nothing wrong. There is
      // no delete grant, on purpose, so the only honest thing is to say it
      // failed and let the owner see a review with no corrections was attempted.
      return NextResponse.redirect(new URL('/contribute?error=failed', request.url), 303);
    }
  }

  return NextResponse.redirect(
    new URL(`/contribute?sent=1&locale=${encodeURIComponent(locale.code)}`, request.url),
    303,
  );
}

/** A `GET` to this route is a mistake, not a form. */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/contribute', request.url), 303);
}
