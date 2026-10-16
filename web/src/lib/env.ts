/**
 * Environment validation at the boundary.
 *
 * A missing Supabase URL should fail loudly at startup, not produce a blank
 * page and a console error the user has to interpret.
 */

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export class MissingSupabaseEnvError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local (see web/.env.example).',
    );
  }
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (process.env.NEXT_PUBLIC_ALLOW_MISSING_SUPABASE === '1') {
      // Build-time only. Any real request will fail with a clear message
      // rather than a null client.
      return { url: 'https://unconfigured.invalid', anonKey: 'unconfigured' };
    }
    throw new MissingSupabaseEnvError();
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
