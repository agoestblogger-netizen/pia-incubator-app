import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('--- Memulai migrasi penghapusan kolom Review ---');

  // 1. Update kartu berstatus 'Review' menjadi 'In Progress'
  const updatedCards: any = await db.execute(sql`
    UPDATE kanban_card
    SET status_kolom = 'In Progress', updated_at = NOW()
    WHERE LOWER(status_kolom) = 'review'
    RETURNING id, judul, tim_inovator_id, sprint_number
  `);

  console.log(`✓ Kartu berstatus 'Review' diubah ke 'In Progress': ${updatedCards.length} kartu.`);
  for (const c of updatedCards) {
    console.log(`  - [${c.id}] ${c.judul} (Tim: ${c.tim_inovator_id}, Sprint: ${c.sprint_number})`);
  }

  // 2. Hapus kolom 'Review' dari kanban_column jika ada
  const deletedCols: any = await db.execute(sql`
    DELETE FROM kanban_column
    WHERE LOWER(nama_kolom) = 'review'
    RETURNING id, tim_inovator_id, nama_kolom
  `);

  console.log(`✓ Kolom 'Review' dihapus dari tabel kanban_column: ${deletedCols.length} baris.`);

  // 3. Verifikasi jumlah status saat ini
  const distinctStatuses: any = await db.execute(sql`
    SELECT status_kolom, count(*) as count
    FROM kanban_card
    GROUP BY status_kolom
    ORDER BY count DESC
  `);

  console.log('\nDistribusi status_kolom di database setelah migrasi:');
  for (const s of distinctStatuses) {
    console.log(`- "${s.status_kolom}": ${s.count} kartu`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
