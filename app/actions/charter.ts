"use server";

import { db } from "@/lib/db";
import { charter } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCharterByTimId(timId: string) {
  const [data] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);
  return data || null;
}

export async function saveCharterAction(timId: string, values: Partial<typeof charter.$inferInsert>) {
  try {
    const [existing] = await db.select().from(charter).where(eq(charter.timInovatorId, timId)).limit(1);

    if (existing) {
      await db.update(charter).set({
        ...values,
        updatedAt: new Date(),
      }).where(eq(charter.id, existing.id));
    } else {
      await db.insert(charter).values({
        timInovatorId: timId,
        ...values,
      });
    }

    revalidatePath(`/tim/${timId}`);
    revalidatePath(`/tim/${timId}/charter`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan Charter.' };
  }
}
