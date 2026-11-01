import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RESTORE_MAX_BYTES, parseRestoreFile, restoreMyData } from '@/lib/restore';

export const dynamic = 'force-dynamic';

/**
 * Put an export back.
 *
 * The body is the file itself, byte for byte, and `?apply=1` turns the dry run
 * into the real thing. That shape is deliberate: the server parses the document
 * it will hand to `restore_my_data()`, so there is one reader of the file rather
 * than a browser that validates and a database that trusts it. The browser
 * checks the file too, but only to save a person from uploading a video — the
 * check that matters is this one.
 *
 * Everything about *what* may be restored lives in the function. This route
 * holds the session and the size ceiling, and nothing else.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const apply = url.searchParams.get('apply') === '1';

  // The name is only ever echoed back to the person who sent it, but it is
  // still trimmed to something a message can hold and stripped of the control
  // characters that make a filename lie about what it is.
  const name = (url.searchParams.get('name') ?? 'the file you chose')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 120);

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > RESTORE_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: `“${name}” is too large to be an export. Choose the JSON file.` },
      { status: 413 },
    );
  }

  const text = await request.text();
  const bytes = Buffer.byteLength(text, 'utf8');
  const parsed = parseRestoreFile(name, bytes, text);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  const outcome = await restoreMyData(supabase, parsed.value, apply);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, message: outcome.message }, { status: 409 });
  }

  return NextResponse.json(outcome, { headers: { 'cache-control': 'no-store' } });
}
