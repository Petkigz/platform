import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'The platform is not configured.' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!raw || typeof raw !== 'object' || !('title' in raw) || !('body' in raw) || !('keywords' in raw) || !('status' in raw) || !('id' in raw) ||
      typeof raw.title !== 'string' || typeof raw.body !== 'string' || typeof raw.keywords !== 'string' ||
      typeof raw.status !== 'string' || (raw.id !== null && (typeof raw.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(raw.id)))) {
    return NextResponse.json({ error: 'Check the article fields.' }, { status: 400 });
  }
  const { error } = await supabase.rpc('save_platform_help_article', {
    p_id: raw.id, p_title: raw.title, p_body: raw.body, p_keywords: raw.keywords, p_status: raw.status,
  });
  if (error) return NextResponse.json({ error: 'Could not save. Check your permissions and article fields.' }, { status: 422 });
  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'private, no-store' } });
}
