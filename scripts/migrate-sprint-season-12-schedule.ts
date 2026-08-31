import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OFFICIAL_SPRINTS = [
  {
    nomorSprint: 1,
    tanggalMulaiRencana: new Date('2026-09-07T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-09-18T23:59:59.000Z'),
    tujuan: 'Perencanaan Customer Validation',
  },
  {
    nomorSprint: 2,
    tanggalMulaiRencana: new Date('2026-09-21T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-10-02T23:59:59.000Z'),
    tujuan: 'Laporan Customer Validation',
  },
  {
    nomorSprint: 3,
    tanggalMulaiRencana: new Date('2026-10-05T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-10-16T23:59:59.000Z'),
    tujuan: 'Perencanaan Market Validation',
  },
  {
    nomorSprint: 4,
    tanggalMulaiRencana: new Date('2026-10-19T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-10-30T23:59:59.000Z'),
    tujuan: 'Market Testing',
  },
  {
    nomorSprint: 5,
    tanggalMulaiRencana: new Date('2026-11-02T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-11-13T23:59:59.000Z'),
    tujuan: 'Market Testing',
  },
  {
    nomorSprint: 6,
    tanggalMulaiRencana: new Date('2026-11-16T00:00:00.000Z'),
    tanggalSelesaiRencana: new Date('2026-11-27T23:59:59.000Z'),
    tujuan: 'Penyelesaian Laporan Market Validation',
  },
];

const LEGACY_TITLES = [
  'Problem Validation & Setup',
  'Solution Exploration & Prototyping',
  'Customer Validation & Testing',
  'MVP Development & Pilot Prep',
  'Market Validation & Pilot Execution',
  'Pitch & FMI Preparation',
];

async function main() {
  const { db } = await import('@/lib/db');
  const { sprint, timInovator } = await import('@/lib/db/schema');
  const { eq, and, asc } = await import('drizzle-orm');

  const teams = await db.select().from(timInovator);
  console.log(`Mengupdate milestone sprint resmi PIA Season 12 untuk ${teams.length} tim...`);

  let updatedCount = 0;

  for (const t of teams) {
    const existingSprints = await db
      .select()
      .from(sprint)
      .where(eq(sprint.timInovatorId, t.id))
      .orderBy(asc(sprint.nomorSprint));

    for (const official of OFFICIAL_SPRINTS) {
      const found = existingSprints.find((s) => s.nomorSprint === official.nomorSprint);

      if (found) {
        // Update jika tanggal masih kosong atau masih menggunakan judul legacy
        const needsUpdate =
          !found.tanggalMulaiRencana ||
          !found.tanggalSelesaiRencana ||
          LEGACY_TITLES.includes(found.tujuan || '');

        if (needsUpdate) {
          await db
            .update(sprint)
            .set({
              tanggalMulaiRencana: found.tanggalMulaiRencana || official.tanggalMulaiRencana,
              tanggalSelesaiRencana: found.tanggalSelesaiRencana || official.tanggalSelesaiRencana,
              tujuan:
                !found.tujuan || LEGACY_TITLES.includes(found.tujuan)
                  ? official.tujuan
                  : found.tujuan,
              updatedAt: new Date(),
            })
            .where(eq(sprint.id, found.id));
          updatedCount++;
        }
      } else {
        // Insert jika belum ada sprint tersebut
        await db.insert(sprint).values({
          timInovatorId: t.id,
          nomorSprint: official.nomorSprint,
          status: 'belum_dimulai',
          tanggalMulaiRencana: official.tanggalMulaiRencana,
          tanggalSelesaiRencana: official.tanggalSelesaiRencana,
          tujuan: official.tujuan,
        });
        updatedCount++;
      }
    }
  }

  console.log(`✓ Selesai! Berhasil memperbarui ${updatedCount} baris sprint untuk semua tim.`);
}

main().catch(console.error).finally(() => process.exit(0));
