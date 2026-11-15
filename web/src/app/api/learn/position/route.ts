import { NextResponse } from 'next/server';

/** Retired unconditional writer. An older player must reload rather than
 * overwrite a position saved by another player. */
export async function POST() {
  return NextResponse.json(
    { error: 'This player is out of date. Reload the lesson to save your place.' },
    { status: 410, headers: { 'cache-control': 'private, no-store' } },
  );
}
