import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production.local' });

export const DISKUSI_PERMISSIONS = [
  {
    kodePermission: 'diskusi.view',
    modul: 'diskusi',
    deskripsi: 'Melihat kanvas diskusi (read-only)',
  },
  {
    kodePermission: 'diskusi.create_canvas',
    modul: 'diskusi',
    deskripsi: 'Membuat kanvas baru',
  },
  {
    kodePermission: 'diskusi.add_sticky',
    modul: 'diskusi',
    deskripsi: 'Menambah sticky note',
  },
  {
    kodePermission: 'diskusi.edit_sticky',
    modul: 'diskusi',
    deskripsi: 'Mengedit/memindahkan sticky note',
  },
  {
    kodePermission: 'diskusi.delete_sticky',
    modul: 'diskusi',
    deskripsi: 'Menghapus sticky note',
  },
  {
    kodePermission: 'diskusi.pin_backlog',
    modul: 'diskusi',
    deskripsi: 'Pin referensi kartu backlog ke kanvas',
  },
  {
    kodePermission: 'diskusi.compile_ai',
    modul: 'diskusi',
    deskripsi: 'Menjalankan Kompilasi AI',
  },
  {
    kodePermission: 'diskusi.assign_backlog',
    modul: 'diskusi',
    deskripsi: 'Simpan hasil kompilasi/sticky ke Backlog & assign ke Sprint',
  },
];

async function main() {
  const { db } = await import('@/lib/db');
  const { permissions, rolePermissions, roles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');
  const { invalidateRbacMatrixCache } = await import('@/lib/auth/rbac');

  console.log('=== 1. Upsert 8 Permission Modul Ruang Diskusi ===');
  const permissionRecordMap = new Map<string, string>(); // kodePermission -> permissionId

  for (const p of DISKUSI_PERMISSIONS) {
    const [existing] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.kodePermission, p.kodePermission))
      .limit(1);

    if (existing) {
      await db
        .update(permissions)
        .set({
          modul: p.modul,
          deskripsi: p.deskripsi,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, existing.id));
      permissionRecordMap.set(p.kodePermission, existing.id);
      console.log(`  [UPDATE] ${p.kodePermission} (${existing.id})`);
    } else {
      const [inserted] = await db
        .insert(permissions)
        .values({
          kodePermission: p.kodePermission,
          modul: p.modul,
          deskripsi: p.deskripsi,
        })
        .returning();
      permissionRecordMap.set(p.kodePermission, inserted.id);
      console.log(`  [INSERT] ${p.kodePermission} (${inserted.id})`);
    }
  }

  console.log('\n=== 2. Sinkronisasi Default Role Permissions ===');
  const allRoles = await db.select().from(roles);
  console.log(`Ditemukan ${allRoles.length} role dalam database.`);

  for (const role of allRoles) {
    const isGuest = role.kodeRole === 'guest';
    console.log(`\n-> Memproses Role: ${role.namaRole} (${role.kodeRole}) [isGuest: ${isGuest}]`);

    for (const p of DISKUSI_PERMISSIONS) {
      const permId = permissionRecordMap.get(p.kodePermission)!;
      // Default: Guest HANYA dapat diskusi.view = TRUE, 7 lainnya = FALSE.
      // Semua role lainnya (admin_ic, sponsor, promotor, project_owner, inisiator, co_creator, coach, sme, divisi_ic) = TRUE.
      const isAllowed = isGuest ? p.kodePermission === 'diskusi.view' : true;

      const [existingRp] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, role.id),
            eq(rolePermissions.permissionId, permId)
          )
        )
        .limit(1);

      if (existingRp) {
        await db
          .update(rolePermissions)
          .set({
            diizinkan: isAllowed,
            updatedAt: new Date(),
          })
          .where(eq(rolePermissions.id, existingRp.id));
        console.log(`   - ${p.kodePermission}: updated -> ${isAllowed ? 'TRUE' : 'FALSE'}`);
      } else {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: permId,
          diizinkan: isAllowed,
        });
        console.log(`   - ${p.kodePermission}: inserted -> ${isAllowed ? 'TRUE' : 'FALSE'}`);
      }
    }
  }

  console.log('\n=== 3. Invalidate In-Memory RBAC Cache ===');
  invalidateRbacMatrixCache();
  console.log('✓ RBAC Cache berhasil di-reset.');

  console.log('\n=== SELESAI: 8 Permission Ruang Diskusi Berhasil Diterapkan ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error saat menjalankan migrasi:', err);
  process.exit(1);
});
