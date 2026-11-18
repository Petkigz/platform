import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { exportFileName } from '@/lib/account';
import { csvDocument, csvFileName, exportSections } from '@/lib/csv';
import { exportCodeOf, exportRefusal, exportStatusOf, type ExportCode } from '@/lib/export-outcome';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

/** A refusal, by name, with the status that name is always answered with. */
function refuse(code: ExportCode) {
  return NextResponse.json(exportRefusal(code), { status: exportStatusOf(code), headers: NO_STORE });
}

/**
 * Download my data.
 *
 * One JSON document, assembled by `export_my_data()` — a definer function with no
 * arguments, so it cannot be pointed at anybody but the caller. The route is a
 * pass-through and holds no rules of its own; what it adds is a filename and a
 * `Content-Disposition`, because a browser should download this rather than render it.
 *
 * `?format=csv` is the same document, shaped for a spreadsheet by `lib/csv`. It
 * is derived here rather than asked for in SQL, so there is exactly one answer to
 * "what does the platform hold about me" and the two formats cannot disagree.
 *
 * Every refusal has a name (`lib/export-outcome.ts`) and its own status. The
 * database's sentence is not forwarded: the buttons that ask for the file say
 * the reason in the reader's language.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'not configured' }, { status: 503 });
  }

  const format = new URL(request.url).searchParams.get('format');
  if (format !== null && format !== 'json' && format !== 'csv') return refuse('format');

  let data: unknown;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return refuse('signed_out');

    const answer = await supabase.rpc('export_my_data');
    if (answer.error) return refuse(exportCodeOf(answer.error));
    data = answer.data;
  } catch {
    return refuse('failed');
  }
  // A reply with no document in it is not a copy of anything.
  if (typeof data !== 'object' || data === null) return refuse('failed');

  if (format === 'csv') {
    const text = `\uFEFF${csvDocument(exportSections(data))}`;
    return new NextResponse(text, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        // A byte-order mark, so Excel on Windows reads UTF-8 rather than the
        // local code page — otherwise every Arabic name in the file is mojibake
        // and the export is worse than useless to the person who asked for it.
        'content-disposition': `attachment; filename="${csvFileName(new Date())}"`,
        ...NO_STORE,
      },
    });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFileName(new Date())}"`,
      ...NO_STORE,
    },
  });
}
