import { handleProviderWebhook } from '@/lib/payments/webhook';
import { isSupabaseConfigured } from '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook/:provider — e.g. /api/payments/webhook/mtn_momo.
 *
 * Needed because more than one provider can be live at once, and each has to be
 * pointed at a URL of its own. The provider named in the path decides which
 * adapter parses the payload; an unknown name is a 404 rather than a
 * confusing signature failure from the unconfigured provider.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  const { provider } = await context.params;
  return handleProviderWebhook(request, provider);
}
