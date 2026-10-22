import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { exportFileName } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * Download my data.
 *
 * One JSON document, assembled by `export_my_data()` — a definer function with no
 * arguments, so it cannot be pointed at anybody but the caller. The route is a
 * pass-through and holds no rules of its own; what it adds is a filename and a
 * `Content-Disposition`, because a browser should download this rather than render it.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
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

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFileName(new Date())}"`,
      'cache-control': 'no-store',
    },
  });
}
