'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstructorProfileInput } from '@/lib/instructor-profiles';

export function ProfileForm({ initial, publicEnabled }: { initial: InstructorProfileInput; publicEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    setError(null);
    const response = await fetch('/api/teach/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: form.get('slug'), displayName: form.get('displayName'),
        headline: form.get('headline'), biography: form.get('biography'),
        websiteUrl: form.get('websiteUrl'), instagramUrl: form.get('instagramUrl'),
        youtubeUrl: form.get('youtubeUrl'), tiktokUrl: form.get('tiktokUrl'),
        facebookUrl: form.get('facebookUrl'), publish: form.get('publish') === 'on',
      }),
    });
    const result = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;
    setBusy(false);
    if (!result?.ok) {
      setError(result?.message ?? 'Could not save the profile.');
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid" style={{ gap: '1rem' }}>
      <div className="notice">
        This is a public introduction, not a qualification check. Do not claim credentials that have not been verified. Your existing social channels remain yours; these links help learners find them.
      </div>
      {!publicEnabled && (
        <div className="notice warn">
          Public profiles are currently off in platform settings. You can prepare and save this profile; visitors will not see it until the administrator enables the feature.
        </div>
      )}
      <label className="field">
        <span>Profile address</span>
        <div className="row"><span className="muted">/teachers/</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} defaultValue={initial.slug} placeholder="amina-yusuf" style={{ flex: 1 }} /></div>
      </label>
      <label className="field"><span>Display name</span><input name="displayName" required maxLength={120} defaultValue={initial.displayName} /></label>
      <label className="field"><span>Short introduction</span><input name="headline" maxLength={160} defaultValue={initial.headline} placeholder="Qur’an and Arabic teacher" /></label>
      <label className="field"><span>Biography</span><textarea name="biography" maxLength={3000} rows={6} defaultValue={initial.biography} placeholder="Tell learners what you teach and how you approach it." /></label>
      <h2>Links</h2>
      <p className="muted" style={{ marginTop: '-.7rem' }}>All links must use HTTPS. Social fields accept only their matching platform domain.</p>
      <label className="field"><span>Website</span><input name="websiteUrl" type="url" defaultValue={initial.websiteUrl} placeholder="https://example.com" /></label>
      <label className="field"><span>Instagram</span><input name="instagramUrl" type="url" defaultValue={initial.instagramUrl} placeholder="https://instagram.com/your-account" /></label>
      <label className="field"><span>YouTube</span><input name="youtubeUrl" type="url" defaultValue={initial.youtubeUrl} placeholder="https://youtube.com/@your-channel" /></label>
      <label className="field"><span>TikTok</span><input name="tiktokUrl" type="url" defaultValue={initial.tiktokUrl} placeholder="https://tiktok.com/@your-account" /></label>
      <label className="field"><span>Facebook</span><input name="facebookUrl" type="url" defaultValue={initial.facebookUrl} placeholder="https://facebook.com/your-page" /></label>
      <label className="row" style={{ alignItems: 'center' }}><input type="checkbox" name="publish" defaultChecked={initial.publish} style={{ width: 'auto', margin: 0 }} /><span>Publish this profile (subject to the platform feature flag)</span></label>
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}
