import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { describeIncidentError } from '@/lib/incidents';

/**
 * The incident register's only door.
 *
 * `platform_admin` or `governance_admin`, checked here and again in every function.
 * The actor is never sent from the client: `require_incident_role()` reads the
 * session, so a tampered request can change what is recorded but not who recorded
 * it — and that distinction is the whole value of an incident log.
 */
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

function count(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) {
    return fail('The owner or governance staff work incidents.', 403);
  }

  const id = new URL(request.url).searchParams.get('incident');
  if (!id) return fail('Name the incident.');

  const [detail, register] = await Promise.all([
    supabase.rpc('incident_detail', { p_incident_id: id }),
    supabase.rpc('incident_register'),
  ]);
  if (detail.error) return fail(describeIncidentError(detail.error.message, detail.error.hint));
  if (register.error) return fail(describeIncidentError(register.error.message, register.error.hint));

  return NextResponse.json({ ok: true, detail: detail.data, register: register.data });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('Malformed request.');
  const body = raw as Record<string, unknown>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  const [{ data: platform }, { data: governance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'governance_admin' }),
  ]);
  if (platform !== true && governance !== true) {
    return fail('The owner or governance staff work incidents.', 403);
  }

  const incidentId = text(body, 'incidentId');

  // Opening an incident is the only action that does not name one first.
  if (body.action === 'open') {
    const categories = Array.isArray(body.categories)
      ? body.categories.filter((c): c is string => typeof c === 'string')
      : [];
    const { data, error } = await supabase.rpc('open_incident', {
      p_title: text(body, 'title'),
      p_summary: text(body, 'summary'),
      p_severity: text(body, 'severity') || 'major',
      p_discovered_at: text(body, 'discoveredAt') || null,
      p_occurred_at: null,
      p_data_categories: categories,
    });
    if (error) return fail(describeIncidentError(error.message, error.hint));
    return NextResponse.json({ ok: true, incident: data });
  }

  if (!incidentId) return fail('Name the incident.');

  switch (body.action) {
    case 'impact': {
      const { error } = await supabase.rpc('record_incident_impact', {
        p_incident_id: incidentId,
        p_people: count(body, 'people'),
        p_children: count(body, 'children'),
        p_teachers: count(body, 'teachers'),
        p_harm: text(body, 'harm') || null,
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'obligation': {
      const { error } = await supabase.rpc('add_incident_notification', {
        p_incident_id: incidentId,
        p_audience: text(body, 'audience'),
        p_basis: text(body, 'basis'),
        p_due_at: text(body, 'dueAt'),
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'notified': {
      const { error } = await supabase.rpc('mark_incident_notified', {
        p_notification_id: text(body, 'notificationId'),
        p_method: text(body, 'method'),
        p_note: text(body, 'note') || null,
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'waive': {
      const { error } = await supabase.rpc('waive_incident_notification', {
        p_notification_id: text(body, 'notificationId'),
        p_reason: text(body, 'reason'),
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'status': {
      const { error } = await supabase.rpc('set_incident_status', {
        p_incident_id: incidentId,
        p_status: text(body, 'status'),
        p_reason: text(body, 'reason') || null,
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'lesson': {
      const { error } = await supabase.rpc('record_incident_lesson', {
        p_incident_id: incidentId,
        p_lessons: text(body, 'lessons'),
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    case 'notice': {
      const { error } = await supabase.rpc('save_incident_notice', {
        p_incident_id: incidentId,
        p_notice: text(body, 'notice'),
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true, sent: false });
    }
    case 'entry': {
      const { error } = await supabase.rpc('log_incident_entry', {
        p_incident_id: incidentId,
        p_body: text(body, 'body'),
        p_kind: text(body, 'kind') || 'update',
      });
      if (error) return fail(describeIncidentError(error.message, error.hint));
      return NextResponse.json({ ok: true });
    }
    default:
      return fail('Unknown action.');
  }
}
