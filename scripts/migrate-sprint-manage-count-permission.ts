import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { permissions, rolePermissions, roles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  console.log('--- 1. Pastikan permission sprint.manage_count ada di tabel permissions ---');
  let [sprintCountPerm] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.kodePermission, 'sprint.manage_count'))
    .limit(1);

  if (!sprintCountPerm) {
    const [inserted] = await db
      .insert(permissions)
      .values({
        kodePermission: 'sprint.manage_count',
        modul: 'kanban',
        deskripsi: 'Mengubah jumlah sprint tim (Kelola Jumlah Sprint)',
      })
      .returning();
    sprintCountPerm = inserted;
    console.log('✓ Permission sprint.manage_count berhasil dibuat:', sprintCountPerm.id);
  } else {
    console.log('ℹ Permission sprint.manage_count sudah ada:', sprintCountPerm.id);
    await db
      .update(permissions)
      .set({
        modul: 'kanban',
        deskripsi: 'Mengubah jumlah sprint tim (Kelola Jumlah Sprint)',
      })
      .where(eq(permissions.id, sprintCountPerm.id));
    console.log('✓ Metadata sprint.manage_count diperbarui.');
  }

  const [kanbanManagePerm] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.kodePermission, 'kanban.manage'))
    .limit(1);

  console.log('\n--- 2. Sinkronisasi Default Value Role Permissions ---');
  const allRoles = await db.select().from(roles);
  console.log(`Ditemukan ${allRoles.length} role di sistem.`);

  for (const role of allRoles) {
    // Default: TRUE untuk role yang memiliki kanban.manage (admin_ic, coach, project_owner)
    let isAllowed = false;
    if (kanbanManagePerm) {
      const [manageRp] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, role.id),
            eq(rolePermissions.permissionId, kanbanManagePerm.id)
          )
        )
        .limit(1);
      isAllowed = manageRp?.diizinkan === true;
    }

    // Role admin_ic & coach selalu default TRUE
    if (role.kodeRole === 'admin_ic' || role.kodeRole === 'coach') {
      isAllowed = true;
    }

    const [existingRp] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, sprintCountPerm.id)
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
      console.log(
        `• Role ${role.kodeRole.padEnd(15)}: update sprint.manage_count = ${isAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    } else {
      await db.insert(rolePermissions).values({
        roleId: role.id,
        permissionId: sprintCountPerm.id,
        diizinkan: isAllowed,
      });
      console.log(
        `• Role ${role.kodeRole.padEnd(15)}: insert sprint.manage_count = ${isAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    }
  }

  console.log('\n✓ Migrasi permission sprint.manage_count selesai dengan sukses!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
