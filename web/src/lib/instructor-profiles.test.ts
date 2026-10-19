import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchInstructorProfile, saveInstructorProfile, validateInstructorProfile } from './instructor-profiles.ts';

const BASE = { slug: 'teacher-amina', displayName: 'Amina Yusuf', publish: false };

function stubRpc(result: { data?: unknown; error?: { message: string } } = { data: 'profile-1' }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = { rpc: async (fn: string, args: Record<string, unknown>) => {
    calls.push({ fn, args }); return result;
  } } as any;
  return { client, calls };
}

test('teacher profile validation accepts safe details and social URLs', () => {
  assert.equal(validateInstructorProfile({ ...BASE, instagramUrl: 'https://www.instagram.com/amina' }), null);
  assert.equal(validateInstructorProfile({ ...BASE, youtubeUrl: 'https://youtu.be/channel' }), null);
  assert.equal(validateInstructorProfile({ ...BASE, websiteUrl: 'https://amina.example' }), null);
});

test('teacher profile validation refuses malformed fields and unsafe or impersonating links', () => {
  assert.match(validateInstructorProfile({ ...BASE, slug: 'Bad Slug' }) ?? '', /lowercase hyphenated/i);
  assert.match(validateInstructorProfile({ ...BASE, displayName: ' ' }) ?? '', /display name/i);
  assert.match(validateInstructorProfile({ ...BASE, displayName: 'x'.repeat(121) }) ?? '', /display name/i);
  assert.match(validateInstructorProfile({ ...BASE, headline: 'x'.repeat(161) }) ?? '', /headline/i);
  assert.match(validateInstructorProfile({ ...BASE, biography: 'x'.repeat(3001) }) ?? '', /biography/i);
  assert.match(validateInstructorProfile({ ...BASE, websiteUrl: 'http://unsafe.example' }) ?? '', /HTTPS/i);
  assert.match(validateInstructorProfile({ ...BASE, instagramUrl: 'https://instagram.com.evil.example/fake' }) ?? '', /instagram.com/i);
  assert.match(validateInstructorProfile({ ...BASE, tiktokUrl: 'https://not-tiktok.example' }) ?? '', /tiktok.com/i);
});

test('saving sends the normalized fields and publish intent to the audited writer', async () => {
  const { client, calls } = stubRpc({ data: 'profile-9' });
  const result = await saveInstructorProfile(client, {
    ...BASE, displayName: ' Amina Yusuf ', headline: '  Teacher ', websiteUrl: ' https://amina.example ',
    instagramUrl: ' https://instagram.com/amina ',
  });
  assert.deepEqual(result, { ok: true, id: 'profile-9' });
  assert.deepEqual(calls, [{ fn: 'save_instructor_public_profile', args: {
    p_slug: 'teacher-amina', p_display_name: 'Amina Yusuf', p_headline: 'Teacher',
    p_biography: null, p_website_url: 'https://amina.example', p_instagram_url: 'https://instagram.com/amina',
    p_youtube_url: null, p_tiktok_url: null, p_facebook_url: null, p_publish: false,
  } }]);
});

test('invalid profile data is stopped before the network request', async () => {
  const { client, calls } = stubRpc();
  const result = await saveInstructorProfile(client, { ...BASE, instagramUrl: 'http://bad.example' });
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test('role and uniqueness errors give teacher-actionable messages', async () => {
  const { client: noRole } = stubRpc({ error: { message: 'an active instructor role is required' } });
  const roleResult = await saveInstructorProfile(noRole, BASE);
  assert.equal(roleResult.ok, false);
  if (!roleResult.ok) assert.match(roleResult.message, /active instructor/i);

  const { client: duplicate } = stubRpc({ error: { message: 'duplicate key violates unique constraint' } });
  const duplicateResult = await saveInstructorProfile(duplicate, BASE);
  assert.equal(duplicateResult.ok, false);
  if (!duplicateResult.ok) assert.match(duplicateResult.message, /already in use/i);
});

test('public profile reads reject drafts at the query and flatten nullable fields', async () => {
  const filters: Record<string, unknown> = {};
  let selection = '';
  const chain: Record<string, unknown> = {};
  chain.select = (value: string) => { selection = value; return chain; };
  chain.eq = (key: string, value: unknown) => { filters[key] = value; return chain; };
  chain.maybeSingle = async () => ({ data: {
    id: 'profile-1', user_id: 'user-1', slug: 'teacher-amina', display_name: 'Amina Yusuf',
    headline: null, biography: null, website_url: null, instagram_url: 'https://instagram.com/amina',
    youtube_url: null, tiktok_url: null, facebook_url: null, status: 'published',
    created_at: 'now', updated_at: 'now',
  }, error: null });
  const client = { from: (table: string) => { assert.equal(table, 'instructor_public_profiles'); return chain; } } as any;
  const profile = await fetchInstructorProfile(client, 'teacher-amina');
  assert.match(selection, /status/);
  assert.equal(filters.slug, 'teacher-amina');
  assert.equal(filters.status, 'published');
  assert.equal(profile?.userId, 'user-1');
  assert.equal(profile?.headline, '');
  assert.equal(profile?.instagramUrl, 'https://instagram.com/amina');
});
