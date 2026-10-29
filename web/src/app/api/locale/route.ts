import { NextResponse } from 'next/server';

import { LOCALE_COOKIE, isLocaleCode, safeNextPath } from '@/lib/i18n';

/**
 * Remember the interface language this browser should use.
 *
 * A choice is written to a cookie, not to an account. Language is a property of
 * the person reading rather than of the record — a shared tablet and a laptop
 * should each speak what they are set to, and a cookie says that without a
 * migration or a policy. The settings page says so in as many words.
 *
 * **`locale=device` clears the choice**, which is the option the whole feature is
 * built on: the default is the language the device asks for, so a person who
 * chose something else must be able to hand that decision back.
 *
 * The response redirects rather than returning a page, so the form works with
 * JavaScript switched off — and `next` is checked to be a path on this site, not
 * an address somebody else supplied.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsJson = contentType.includes('application/json');

  let chosen: string | null = null;
  let next: string | null = null;

  try {
    if (wantsJson) {
      const body = (await request.json()) as { locale?: unknown; next?: unknown };
      chosen = typeof body.locale === 'string' ? body.locale : null;
      next = typeof body.next === 'string' ? body.next : null;
    } else {
      const form = await request.formData();
      const locale = form.get('locale');
      const target = form.get('next');
      chosen = typeof locale === 'string' ? locale : null;
      next = typeof target === 'string' ? target : null;
    }
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }

  // `device` is not a language: it is the instruction to stop overriding one.
  const clears = chosen === 'device';
  if (!clears && !isLocaleCode(chosen)) {
    return NextResponse.json(
      { ok: false, message: 'That is not one of the languages this interface has.' },
      { status: 400 },
    );
  }

  // Only a path on this site. `//evil.example` and `https://…` are both somebody
  // else's address, and a redirect that follows one is a way to launder trust.
  const safeNext = safeNextPath(next);

  const response = wantsJson
    ? NextResponse.json({ ok: true, locale: clears ? null : chosen, next: safeNext })
    : NextResponse.redirect(new URL(safeNext, request.url), 303);

  if (clears) {
    response.cookies.delete(LOCALE_COOKIE);
  } else {
    response.cookies.set(LOCALE_COOKIE, chosen as string, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  return response;
}
