import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { exportFileName } from '@/lib/account';
import { csvDocument, csvFileName, exportSections } from '@/lib/csv';

export const dynamic = 'force-dynamic';

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
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const format = new URL(request.url).searchParams.get('format');
  if (format !== null && format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'sign in to download your data' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('export_my_data');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

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
        'cache-control': 'no-store',
      },
    });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFileName(new Date())}"`,
      'cache-control': 'no-store',
    },
  });
}
