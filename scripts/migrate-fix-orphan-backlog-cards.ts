import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { kanbanCard, kanbanSubtask } = await import('@/lib/db/schema');
  const { isNull, and, eq } = await import('drizzle-orm');

  console.log('=== Memeriksa Kartu Orphan (sprintNumber IS NULL AND reviewStatus = "adopted") ===');

  const orphans = await db
    .select()
    .from(kanbanCard)
    .where(
      and(
        isNull(kanbanCard.sprintNumber),
        eq(kanbanCard.reviewStatus, 'adopted')
      )
    );

  console.log(`Ditemukan ${orphans.length} kartu orphan.`);

  if (orphans.length === 0) {
    console.log('Tidak ada kartu orphan yang perlu diperbaiki.');
    return;
  }

  for (const card of orphans) {
    // Check subtasks
    const subtasks = await db
      .select({ id: kanbanSubtask.id, title: kanbanSubtask.title, isDone: kanbanSubtask.isDone })
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.taskId, card.id));

    console.log(`\nMemperbaiki kartu [${card.id}]: "${card.judul}"`);
    console.log(`  - Status awal: statusKolom="${card.statusKolom}", reviewStatus="${card.reviewStatus}"`);
    console.log(`  - Jumlah subtask terkait: ${subtasks.length} item (aman, tidak disentuh)`);

    await db
      .update(kanbanCard)
      .set({
        reviewStatus: 'ai_reference',
        statusKolom: 'To Do',
        updatedAt: new Date(),
      })
      .where(eq(kanbanCard.id, card.id));

    console.log(`  -> Berhasil diupdate: reviewStatus="ai_reference", statusKolom="To Do"`);
  }

  // Verifikasi ulang
  const remaining = await db
    .select()
    .from(kanbanCard)
    .where(
      and(
        isNull(kanbanCard.sprintNumber),
        eq(kanbanCard.reviewStatus, 'adopted')
      )
    );

  console.log(`\n=== Verifikasi Selesai: Sisa kartu orphan = ${remaining.length} ===`);
}

main().catch(console.error).finally(() => process.exit(0));
