import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { kanbanCard, kanbanSubtask } = await import('@/lib/db/schema');
  const { eq, ilike, and, asc } = await import('drizzle-orm');

  const cards = await db
    .select()
    .from(kanbanCard)
    .where(ilike(kanbanCard.judul, 'Lakukan sesi user testing%'));

  console.log(`Ditemukan ${cards.length} kartu 'Lakukan sesi user testing'. Memeriksa subtask...`);

  let addedCount = 0;

  for (const card of cards) {
    const subtasks = await db
      .select()
      .from(kanbanSubtask)
      .where(eq(kanbanSubtask.taskId, card.id))
      .orderBy(asc(kanbanSubtask.orderIndex));

    const alreadyExists = subtasks.some(
      (s) =>
        s.title.toLowerCase().includes('7 parameter') ||
        (s.reportFieldMapping as any)?.field === 'psf_7param_measurement'
    );

    if (!alreadyExists) {
      // Cari subtask feedback matrix
      const feedbackIdx = subtasks.findIndex((s) =>
        s.title.toLowerCase().includes('feedback matrix')
      );

      const targetOrder = feedbackIdx >= 0 ? feedbackIdx + 1 : 2;

      // Geser orderIndex subtask setelahnya
      for (let i = targetOrder; i < subtasks.length; i++) {
        await db
          .update(kanbanSubtask)
          .set({ orderIndex: i + 1 })
          .where(eq(kanbanSubtask.id, subtasks[i].id));
      }

      // Insert subtask wajib baru
      await db.insert(kanbanSubtask).values({
        taskId: card.id,
        title: 'Isi Hasil Pengukuran Metrik PSF (7 Parameter)',
        estimatedHours: 180,
        isDone: false,
        orderIndex: targetOrder,
        subtaskType: 'mandatory_complex',
        reportFieldMapping: { field: 'psf_7param_measurement' },
        createdBy: null,
      });

      addedCount++;
      console.log(`✓ Kartu ${card.id} (Tim: ${card.timInovatorId}): Ditambahkan subtask 'Isi Hasil Pengukuran Metrik PSF (7 Parameter)'`);
    } else {
      console.log(`- Kartu ${card.id}: Sudah memiliki subtask 7 parameter.`);
    }
  }

  console.log(`\nSelesai! Berhasil menambahkan subtask wajib ke-3 ke ${addedCount} kartu.`);
}

main().catch(console.error).finally(() => process.exit(0));
