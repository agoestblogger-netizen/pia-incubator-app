import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'DB unreachable' },
      { status: 500 }
    );
  }
}