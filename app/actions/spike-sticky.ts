'use server';

import { db } from '@/lib/db';
import { sql, eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/rbac';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SpikeSticky = {
  id: string;
  tim_id: string;
  content: string;
  pos_x: number;
  pos_y: number;
  color: string;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string;
  created_at: string;
};

const STICKY_COLORS = [
  '#FEF3C7', // yellow
  '#DBEAFE', // blue
  '#D1FAE5', // green
  '#FCE7F3', // pink
  '#EDE9FE', // purple
  '#FEE2E2', // red
];

// ─── Get all stickies for a team ─────────────────────────────────────────────
export async function getSpikeStickiesAction(timId: string) {
  try {
    const rows = await db.execute(
      sql`SELECT * FROM spike_sticky_note WHERE tim_id = ${timId} ORDER BY created_at ASC`
    );
    return { success: true, data: rows as unknown as SpikeSticky[] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Create sticky ────────────────────────────────────────────────────────────
export async function createSpikeSticky(timId: string, posX: number, posY: number) {
  try {
    const user = await getCurrentUser();
    const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    const rows = await db.execute(
      sql`INSERT INTO spike_sticky_note (tim_id, content, pos_x, pos_y, color, created_by, created_by_name)
          VALUES (${timId}, 'Ketik di sini...', ${posX}, ${posY}, ${color}, ${user?.id ?? null}, ${user?.nama ?? 'Anonim'})
          RETURNING *`
    );
    return { success: true, data: (rows as unknown as SpikeSticky[])[0] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Update sticky content ────────────────────────────────────────────────────
export async function updateSpikeStickyContent(id: string, content: string) {
  try {
    const rows = await db.execute(
      sql`UPDATE spike_sticky_note SET content = ${content}, updated_at = NOW() WHERE id = ${id} RETURNING *`
    );
    return { success: true, data: (rows as unknown as SpikeSticky[])[0] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Update sticky position ───────────────────────────────────────────────────
export async function updateSpikeStickyPosition(id: string, posX: number, posY: number) {
  try {
    const rows = await db.execute(
      sql`UPDATE spike_sticky_note SET pos_x = ${posX}, pos_y = ${posY}, updated_at = NOW() WHERE id = ${id} RETURNING *`
    );
    return { success: true, data: (rows as unknown as SpikeSticky[])[0] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Delete sticky ────────────────────────────────────────────────────────────
export async function deleteSpikeSticky(id: string) {
  try {
    await db.execute(sql`DELETE FROM spike_sticky_note WHERE id = ${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
