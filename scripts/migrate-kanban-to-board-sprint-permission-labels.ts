import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { sql } = await import('drizzle-orm');

  await db.execute(sql`
    UPDATE permissions
    SET deskripsi = 'Akses penuh Board Sprint dan timeline'
    WHERE kode_permission = 'kanban.manage';

    UPDATE permissions
    SET deskripsi = 'Menambah dan menggeser kartu Board Sprint'
    WHERE kode_permission = 'kanban.edit';

    UPDATE permissions
    SET deskripsi = 'Memberikan komentar pada kartu Board Sprint'
    WHERE kode_permission = 'kanban.comment';

    UPDATE permissions
    SET deskripsi = 'Melihat Board Sprint dan timeline'
    WHERE kode_permission = 'kanban.view';

    UPDATE permissions
    SET deskripsi = 'Menghapus kartu Board Sprint'
    WHERE kode_permission = 'kanban.delete';
  `);

  console.log('Permissions updated successfully in database.');
}

main().catch(console.error).finally(() => process.exit(0));
