import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RESTORE_MAX_BYTES, parseRestoreFile, restoreMyData } from '@/lib/restore';
import { restoreRefusal, restoreStatusOf, type RestoreCode } from '@/lib/restore-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: RestoreCode) {
  return NextResponse.json(restoreRefusal(code), { status: restoreStatusOf(code), headers: NO_STORE });
}

/**
 * Put an export back.
 *
 * The body is the file itself, byte for byte, and `?apply=1` turns the dry run
 * into the real thing. That shape is deliberate: the server parses the document
 * it will hand to `restore_my_data()`, so there is one reader of the file rather
 * than a browser that validates and a database that trusts it. The browser
 * checks the file too, but only to save a person from uploading a video; the
 * check that matters is this one.
 *
 * Everything about *what* may be restored lives in the function. This route
 * holds the session and the size ceiling, and nothing else.
 *
 * Every refusal has a name (`lib/restore-outcome.ts`) and its own status, and
 * the report names the reason for each entry it left in the file. No sentence
 * the database wrote is forwarded, and neither is the name of the file: the
 * screen that asked says all of it in the reader's language.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const apply = new URL(request.url).searchParams.get('apply') === '1';

    const declared = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > RESTORE_MAX_BYTES) return refuse('too_large');

    const text = await request.text();
    const parsed = parseRestoreFile(Buffer.byteLength(text, 'utf8'), text);
    if (!parsed.ok) return refuse(parsed.code);

    const outcome = await restoreMyData(supabase, parsed.value, apply);
    if (!outcome.ok) return refuse(outcome.code);

    return NextResponse.json(outcome, { headers: NO_STORE });
  } catch {
    // Nothing is known about what happened, so nothing is claimed.
    return refuse('failed');
  }
}
