import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createFamily } from '@/lib/family';
import { FAMILY_NAME_MAX, familyRefusal, familyStatusOf, type FamilyCode } from '@/lib/family-outcome';

/**
 * Create a family.
 *
 * A refusal names its reason (`lib/family-outcome.ts`); the form on `/family`
 * says the sentence in the reader's language. The English beside the code is
 * for a caller with no words of its own, and it is never the database's.
 */
const refuse = (code: FamilyCode) =>
  NextResponse.json(familyRefusal(code), { status: familyStatusOf(code) });

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return refuse('malformed'); }
  const body = (raw && typeof raw === 'object' ? raw : {}) as { name?: unknown };
  if (body.name !== undefined && typeof body.name !== 'string') return refuse('malformed');
  if (typeof body.name === 'string' && body.name.trim().length > FAMILY_NAME_MAX) return refuse('name_long');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return refuse('signed_out');

  const result = await createFamily(supabase, typeof body.name === 'string' ? body.name : undefined);
  if (!result.ok) return NextResponse.json(result, { status: familyStatusOf(result.code) });
  return NextResponse.json(result, { status: 201 });
}
