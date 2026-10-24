import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Whether the browser is signed in, and under what name.
 *
 * The masthead is in the root layout, which stays auth-agnostic so pages can be
 * rendered statically — so the header cannot learn this on the server without
 * making every page in the product dynamic. It asks this endpoint after
 * hydration instead, and renders the signed-out pair until the answer arrives.
 *
 * `no-store` matters: a cached "signed in" answer served after a sign-out would
 * offer a visitor a "Your area" button that redirects to sign-in, and a cached
 * "signed out" answer would do the reverse. The answer is also deliberately
 * small — a boolean and a first name, never an id, an email or a role list.
 */
const noStore = { 'cache-control': 'no-store' } as const;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ signedIn: false }, { headers: noStore });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ signedIn: false }, { headers: noStore });

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(
    { signedIn: true, name: (data?.display_name as string | null) ?? null },
    { headers: noStore },
  );
}
