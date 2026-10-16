import { handleProviderWebhook } from '@/lib/payments/webhook';
import { isSupabaseConfigured } from '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook — provider callback, provider implied.
 *
 * Kept for deployments that run a single provider, and for providers already
 * pointed at this URL. The logic lives in lib/payments/webhook so that this
 * route and the per-provider ones cannot drift apart — the difference between
 * them is only which provider is resolved.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  return handleProviderWebhook(request);
}
