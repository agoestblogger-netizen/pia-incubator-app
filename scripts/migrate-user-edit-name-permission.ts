import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { permissions, rolePermissions, roles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  console.log('--- 1. Pastikan permission user.edit_name ada di tabel permissions ---');
  let [userEditNamePerm] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.kodePermission, 'user.edit_name'))
    .limit(1);

  if (!userEditNamePerm) {
    const [inserted] = await db
      .insert(permissions)
      .values({
        kodePermission: 'user.edit_name',
        modul: 'kelola_user',
        deskripsi: 'Mengubah nama user (tanpa akses penuh kelola role)',
      })
      .returning();
    userEditNamePerm = inserted;
    console.log('✓ Permission user.edit_name berhasil dibuat:', userEditNamePerm.id);
  } else {
    console.log('ℹ Permission user.edit_name sudah ada:', userEditNamePerm.id);
    await db
      .update(permissions)
      .set({
        modul: 'kelola_user',
        deskripsi: 'Mengubah nama user (tanpa akses penuh kelola role)',
      })
      .where(eq(permissions.id, userEditNamePerm.id));
    console.log('✓ Metadata user.edit_name diperbarui.');
  }

  const [userManagePerm] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.kodePermission, 'user.manage'))
    .limit(1);

  if (!userManagePerm) {
    throw new Error('Permission user.manage tidak ditemukan!');
  }

  console.log('\n--- 2. Sinkronisasi Default Value Role Permissions ---');
  const allRoles = await db.select().from(roles);
  console.log(`Ditemukan ${allRoles.length} role di sistem.`);

  for (const role of allRoles) {
    // Cek apakah role ini memiliki user.manage = true ATAU merupakan role admin_ic / coach
    const [manageRp] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, userManagePerm.id)
        )
      )
      .limit(1);

    const isManageAllowed =
      manageRp?.diizinkan === true ||
      role.kodeRole === 'admin_ic' ||
      role.kodeRole === 'coach';

    // Cek apakah rolePermissions untuk user.edit_name sudah ada
    const [editNameRp] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, userEditNamePerm.id)
        )
      )
      .limit(1);

    if (editNameRp) {
      await db
        .update(rolePermissions)
        .set({
          diizinkan: isManageAllowed,
          updatedAt: new Date(),
        })
        .where(eq(rolePermissions.id, editNameRp.id));
      console.log(
        `• Role ${role.kodeRole.padEnd(15)}: update user.edit_name = ${isManageAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    } else {
      await db.insert(rolePermissions).values({
        roleId: role.id,
        permissionId: userEditNamePerm.id,
        diizinkan: isManageAllowed,
      });
      console.log(
        `• Role ${role.kodeRole.padEnd(15)}: insert user.edit_name = ${isManageAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    }
  }

  console.log('\n✓ Migrasi permission user.edit_name selesai dengan sukses!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
