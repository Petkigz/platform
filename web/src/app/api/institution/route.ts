import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { institutionRefusal } from '@/lib/institution';

/**
 * The institution console's writes.
 *
 * Every rule is the database's: who is an administrator, which flag is on, what
 * a domain claim may look like, when a key stops working. This route picks the
 * function and turns a refusal into a sentence.
 *
 * **The key secret is generated here and never sent to the database.** Only its
 * SHA-256 crosses the wire, so the plaintext exists in this process for the
 * length of one response — long enough to show it once — and in nobody's table
 * afterwards. That is why `create_institution_api_key()` takes a prefix and a
 * hash rather than a secret.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  const action = typeof body.action === 'string' ? body.action : '';
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ ok: false, ...institutionRefusal(message) }, { status });

  if (action === 'branding') {
    const { error } = await supabase.rpc('update_institution_branding', {
      p_display_name: str(body.displayName),
      p_tagline: str(body.tagline),
      p_accent: str(body.accent),
      p_logo_url: str(body.logoUrl),
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  if (action === 'claim') {
    const domain = str(body.domain);
    if (!domain) {
      return NextResponse.json(
        { ok: false, code: 'domain_required', message: 'Type the domain, for example school.example.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('claim_institution_domain', { p_domain: domain });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'createKey') {
    const name = str(body.name);
    if (!name) {
      return NextResponse.json(
        { ok: false, message: 'Give the key a name you will recognise later.' },
        { status: 400 },
      );
    }
    const prefix = randomBytes(6).toString('hex');
    const secret = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(secret).digest('hex');

    const { data, error } = await supabase.rpc('create_institution_api_key', {
      p_name: name,
      p_prefix: prefix,
      p_hash: hash,
    });
    if (error) return fail(error.message);

    // The only time the whole key exists. It is not stored anywhere, so there is
    // no "show it again" and the screen has to say so.
    return NextResponse.json({
      ok: true,
      ...(data as object),
      key: `ayi_${prefix}_${secret}`,
      shownOnce: true,
    });
  }

  if (action === 'revokeKey') {
    const keyId = str(body.keyId);
    const reason = str(body.reason);
    if (!keyId) {
      return NextResponse.json({ ok: false, message: 'Which key?' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json(
        { ok: false, code: 'reason_required', message: 'Write a reason. Somebody will read it.' },
        { status: 400 },
      );
    }
    const { error } = await supabase.rpc('revoke_institution_api_key', {
      p_key_id: keyId,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true });
  }

  if (action === 'create') {
    const code = str(body.code);
    const name = str(body.name);
    const type = str(body.type);
    const adminEmail = str(body.adminEmail);
    const reason = str(body.reason);
    if (!code || !name || !type || !adminEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: 'A code, a name, a type and the administrator’s email address are all needed.',
        },
        { status: 400 },
      );
    }
    if (!reason) {
      return NextResponse.json(
        { ok: false, code: 'reason_required', message: 'Write a reason. Somebody will read it.' },
        { status: 400 },
      );
    }

    // The owner knows the head teacher by address, not by uuid. The lookup is a
    // function of its own so the form never needs a second screen, and so the
    // address is resolved once rather than being trusted from the browser as an
    // id somebody could have swapped.
    const { data: candidate, error: lookupError } = await supabase.rpc(
      'institution_admin_candidate',
      { p_email: adminEmail },
    );
    if (lookupError) return fail(lookupError.message);
    const userId = (candidate as { userId?: string } | null)?.userId;
    if (!userId) {
      return NextResponse.json(
        { ok: false, code: 'admin_not_found', message: 'That account does not exist.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc('create_institution', {
      p_code: code,
      p_name: name,
      p_type: type,
      p_admin_user_id: userId,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'verifyDomain') {
    const domainId = str(body.domainId);
    const verified = body.verified === true;
    const reason = str(body.reason);
    if (!domainId) {
      return NextResponse.json({ ok: false, message: 'Which claim?' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json(
        { ok: false, code: 'reason_required', message: 'Write a reason. Somebody will read it.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('verify_institution_domain', {
      p_domain_id: domainId,
      p_verified: verified,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'setAdmin') {
    const institutionId = str(body.institutionId);
    const email = str(body.email);
    const makeAdmin = body.makeAdmin === true;
    const reason = str(body.reason);
    if (!institutionId || !email) {
      return NextResponse.json(
        { ok: false, message: 'Which institution, and which account?' },
        { status: 400 },
      );
    }
    if (!reason) {
      return NextResponse.json(
        { ok: false, code: 'reason_required', message: 'Write a reason. Somebody will read it.' },
        { status: 400 },
      );
    }
    const { data: candidate, error: lookupError } = await supabase.rpc(
      'institution_admin_candidate',
      { p_email: email },
    );
    if (lookupError) return fail(lookupError.message);
    const userId = (candidate as { userId?: string } | null)?.userId;
    if (!userId) {
      return NextResponse.json(
        { ok: false, code: 'admin_not_found', message: 'That account does not exist.' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('set_institution_admin', {
      p_institution: institutionId,
      p_user_id: userId,
      p_make_admin: makeAdmin,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'join') {
    const { data, error } = await supabase.rpc('join_institution');
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  if (action === 'leave') {
    const { data, error } = await supabase.rpc('leave_institution');
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
}
