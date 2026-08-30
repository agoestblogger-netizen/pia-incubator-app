import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { permissions, rolePermissions, roles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  console.log('--- 1. Pastikan permission user.create ada di tabel permissions ---');
  let [userCreatePerm] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.kodePermission, 'user.create'))
    .limit(1);

  if (!userCreatePerm) {
    const [inserted] = await db
      .insert(permissions)
      .values({
        kodePermission: 'user.create',
        modul: 'kelola_user',
        deskripsi: 'Membuat akun/user baru (tanpa akses penuh kelola role)',
      })
      .returning();
    userCreatePerm = inserted;
    console.log('✓ Permission user.create berhasil dibuat:', userCreatePerm.id);
  } else {
    console.log('ℹ Permission user.create sudah ada:', userCreatePerm.id);
    await db
      .update(permissions)
      .set({
        modul: 'kelola_user',
        deskripsi: 'Membuat akun/user baru (tanpa akses penuh kelola role)',
      })
      .where(eq(permissions.id, userCreatePerm.id));
    console.log('✓ Metadata user.create diperbarui.');
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
    // Cek apakah role ini memiliki user.manage = true
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

    const isManageAllowed = manageRp?.diizinkan === true;

    // Cek apakah rolePermissions untuk user.create sudah ada
    const [createRp] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, userCreatePerm.id)
        )
      )
      .limit(1);

    if (createRp) {
      // Jika sudah ada, update sesuai status manage (atau pertahankan jika sudah ada)
      await db
        .update(rolePermissions)
        .set({
          diizinkan: isManageAllowed,
          updatedAt: new Date(),
        })
        .where(eq(rolePermissions.id, createRp.id));
      console.log(
        `• Role ${role.kodeRole} (${role.namaRole}): update user.create = ${isManageAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    } else {
      await db.insert(rolePermissions).values({
        roleId: role.id,
        permissionId: userCreatePerm.id,
        diizinkan: isManageAllowed,
      });
      console.log(
        `• Role ${role.kodeRole} (${role.namaRole}): insert user.create = ${isManageAllowed ? 'TRUE (aktif)' : 'FALSE'}`
      );
    }
  }

  console.log('\n✓ Migrasi permission user.create selesai dengan sukses!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
