import { NextResponse } from 'next/server';
import { isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleResendWebhook, isResendWebhookConfigured } from '@/lib/email/provider-events';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email/webhook: the email provider's word on a message after it
 * accepted it (delivered, delayed, bounced, marked as spam, failed).
 *
 * Resend calls this, signed with the webhook's signing secret
 * (`RESEND_WEBHOOK_SECRET`). Until that secret exists the route answers 503
 * and reads nothing. The body is read as text, because the signature is over
 * the bytes that arrived.
 */
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!isResendWebhookConfigured(secret) || !isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, code: 'not_configured' }, { status: 503, headers });
  }
  const body = await request.text();
  const answer = await handleResendWebhook({
    secret,
    headers: {
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    },
    body,
    nowSeconds: Math.floor(Date.now() / 1000),
    async record(eventId, event) {
      const { error } = await createAdminClient().rpc('record_provider_event', {
        p_provider: 'resend',
        p_event_id: eventId,
        p_kind: event.kind,
        p_reference: event.reference,
        p_permanent: event.permanent,
        p_occurred_at: event.occurredAt,
      });
      if (error) throw new Error('not recorded');
    },
  });
  return NextResponse.json(answer.body, { status: answer.status, headers });
}
