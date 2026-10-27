import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * The one public-ish endpoint: an institution's own report, read with a key.
 *
 * `Authorization: Bearer ayi_<prefix>_<secret>` — the secret half is hashed here
 * and the hash is what the database compares, so the plaintext is never stored
 * and never logged. A key that does not exist and a key that was revoked are the
 * same answer, because telling them apart helps somebody guess.
 *
 * The payload is exactly what the console prints: counts. No learner, no name,
 * no email, and no institution member list.
 */
function splitKey(header: string | null): { prefix: string; hash: string } | null {
  if (!header) return null;
  const match = /^Bearer\s+ayi_([a-f0-9]{12})_([A-Za-z0-9_-]{20,})$/.exec(header.trim());
  if (!match) return null;
  return {
    prefix: match[1]!,
    hash: createHash('sha256').update(match[2]!).digest('hex'),
  };
}

function dateParam(value: string | null, fallback: Date): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const key = splitKey(request.headers.get('authorization'));
  if (!key) {
    return NextResponse.json(
      {
        error: 'unauthorized',
        message:
          'Send an institution key: Authorization: Bearer ayi_<prefix>_<secret>. A key is created ' +
          'on the institution page and is shown once.',
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const to = dateParam(url.searchParams.get('to'), new Date());
  const from = dateParam(
    url.searchParams.get('from'),
    new Date(new Date(to).getTime() - 365 * 24 * 60 * 60 * 1000),
  );

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('institution_api_report', {
    p_prefix: key.prefix,
    p_hash: key.hash,
    p_from: from,
    p_to: to,
  });

  if (error) {
    const message = error.message ?? '';
    if (/bad_key/.test(message)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (/rate_limited/.test(message)) {
      return NextResponse.json(
        { error: 'rate_limited', message: '240 calls an hour per key.' },
        { status: 429 },
      );
    }
    if (/api_closed/.test(message)) {
      return NextResponse.json(
        { error: 'disabled', message: 'The institution API is switched off.' },
        { status: 503 },
      );
    }
    if (/window_too_long|bad_window/.test(message)) {
      return NextResponse.json(
        { error: 'bad_window', message: 'Use from and to as YYYY-MM-DD, two years apart or less.' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: {
      // A report is a snapshot; a shared cache must not serve one institution's
      // numbers to another.
      'cache-control': 'no-store',
    },
  });
}
