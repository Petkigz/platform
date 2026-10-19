import type { SupabaseClient } from '@supabase/supabase-js';

export type InstructorProfileInput = {
  slug: string;
  displayName: string;
  headline?: string;
  biography?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  publish: boolean;
};

export type InstructorProfile = InstructorProfileInput & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileResult = { ok: true; id: string } | { ok: false; message: string };

const SOCIAL_HOSTS: Record<string, string[]> = {
  instagramUrl: ['instagram.com'],
  youtubeUrl: ['youtube.com', 'youtu.be'],
  tiktokUrl: ['tiktok.com'],
  facebookUrl: ['facebook.com'],
};

function checkUrl(value: string | undefined, key: string, label: string): string | null {
  const text = value?.trim();
  if (!text) return null;
  let url: URL;
  try { url = new URL(text); }
  catch { return `${label} must be a valid HTTPS URL.`; }
  if (url.protocol !== 'https:') return `${label} must use HTTPS.`;
  const domains = SOCIAL_HOSTS[key];
  if (domains && !domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)))
    return `${label} must link to ${domains.join(' or ')}.`;
  return null;
}

export function validateInstructorProfile(input: InstructorProfileInput): string | null {
  const slug = input.slug.trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use a lowercase hyphenated profile address.';
  if (!input.displayName.trim() || input.displayName.trim().length > 120)
    return 'Display name must be between 1 and 120 characters.';
  if ((input.headline?.length ?? 0) > 160) return 'Keep the headline under 160 characters.';
  if ((input.biography?.length ?? 0) > 3000) return 'Keep the biography under 3,000 characters.';
  for (const field of ['websiteUrl', 'instagramUrl', 'youtubeUrl', 'tiktokUrl', 'facebookUrl'] as const) {
    const error = checkUrl(input[field], field, field.replace('Url', ' link'));
    if (error) return error;
  }
  return null;
}

export async function saveInstructorProfile(
  supabase: SupabaseClient,
  input: InstructorProfileInput,
): Promise<ProfileResult> {
  const invalid = validateInstructorProfile(input);
  if (invalid) return { ok: false, message: invalid };
  const { data, error } = await supabase.rpc('save_instructor_public_profile', {
    p_slug: input.slug.trim(),
    p_display_name: input.displayName.trim(),
    p_headline: input.headline?.trim() || null,
    p_biography: input.biography?.trim() || null,
    p_website_url: input.websiteUrl?.trim() || null,
    p_instagram_url: input.instagramUrl?.trim() || null,
    p_youtube_url: input.youtubeUrl?.trim() || null,
    p_tiktok_url: input.tiktokUrl?.trim() || null,
    p_facebook_url: input.facebookUrl?.trim() || null,
    p_publish: input.publish,
  });
  if (error) {
    if (/active instructor role is required/i.test(error.message))
      return { ok: false, message: 'An active instructor role is required to manage a public profile.' };
    if (/unique constraint|duplicate key/i.test(error.message))
      return { ok: false, message: 'That profile address is already in use.' };
    return { ok: false, message: error.message };
  }
  return { ok: true, id: String(data) };
}

export async function fetchInstructorProfile(
  supabase: SupabaseClient,
  slug: string,
): Promise<InstructorProfile | null> {
  const { data, error } = await supabase
    .from('instructor_public_profiles')
    .select('id,user_id,slug,display_name,headline,biography,website_url,instagram_url,youtube_url,tiktok_url,facebook_url,status,created_at,updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as {
    id: string; user_id: string; slug: string; display_name: string; headline: string | null;
    biography: string | null; website_url: string | null; instagram_url: string | null;
    youtube_url: string | null; tiktok_url: string | null; facebook_url: string | null;
    status: 'published'; created_at: string; updated_at: string;
  };
  return {
    id: row.id, userId: row.user_id, slug: row.slug, displayName: row.display_name,
    headline: row.headline ?? '', biography: row.biography ?? '',
    websiteUrl: row.website_url ?? '', instagramUrl: row.instagram_url ?? '',
    youtubeUrl: row.youtube_url ?? '', tiktokUrl: row.tiktok_url ?? '',
    facebookUrl: row.facebook_url ?? '', publish: true,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
