import { NextResponse } from 'next/server';

// Old pages cannot safely write a lesson-wide place after recording-specific
// positions are introduced. Both operations require a fresh page, not a retry.
export const dynamic = 'force-dynamic';
function retired() {
  return NextResponse.json({ error: 'This player is out of date. Reload the lesson to save your place.' }, {
    status: 410, headers: { 'cache-control': 'private, no-store' },
  });
}
export async function GET() { return retired(); }
export async function POST() { return retired(); }
