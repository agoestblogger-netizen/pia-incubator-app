import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { permissions, rolePermissions, roles } = await import('@/lib/db/schema');
  const { eq, and } = await import('drizzle-orm');

  console.log('=== MIGRATION: ADD charter.sign_po & charter.sign_coach ===\n');

  const newPermissions = [
    {
      kodePermission: 'charter.sign_po',
      modul: 'tanda_tangan_dokumen',
      deskripsi: 'Menandatangani Dokumen Innovation Charter (Project Owner - Disusun Oleh)',
    },
    {
      kodePermission: 'charter.sign_coach',
      modul: 'tanda_tangan_dokumen',
      deskripsi: 'Menandatangani Dokumen Innovation Charter (Innovation Coach - Diperiksa Oleh)',
    },
  ];

  for (const np of newPermissions) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.kodePermission, np.kodePermission)).limit(1);
    let permId = existing?.id;
    if (!permId) {
      const [inserted] = await db.insert(permissions).values(np).returning();
      permId = inserted.id;
      console.log(`✓ Inserted permission: ${np.kodePermission}`);
    } else {
      console.log(`• Permission already exists: ${np.kodePermission}`);
    }

    // Now populate rolePermissions for ALL roles
    const allRoles = await db.select().from(roles);
    for (const r of allRoles) {
      let shouldBeTrue = false;
      if (r.kodeRole === 'admin_ic') {
        shouldBeTrue = true;
      } else if (r.kodeRole === 'project_owner' && np.kodePermission === 'charter.sign_po') {
        shouldBeTrue = true;
      } else if (r.kodeRole === 'coach' && np.kodePermission === 'charter.sign_coach') {
        shouldBeTrue = true;
      }

      await db
        .insert(rolePermissions)
        .values({
          roleId: r.id,
          permissionId: permId,
          diizinkan: shouldBeTrue,
        })
        .onConflictDoUpdate({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
          set: { diizinkan: shouldBeTrue, updatedAt: new Date() },
        });

      console.log(`  - Role ${r.kodeRole.padEnd(16)}: ${np.kodePermission} = ${shouldBeTrue ? 'TRUE' : 'FALSE'}`);
    }
  }

  // AUDIT: Ensure ALL custom roles have FALSE for all signature permissions
  console.log('\n--- AUDIT ALL CUSTOM ROLES SIGNATURE PERMISSIONS ---');
  const customRoles = await db.select().from(roles).where(eq(roles.isDefault, false));
  const sigPerms = await db.select().from(permissions).where(eq(permissions.modul, 'tanda_tangan_dokumen'));

  for (const cr of customRoles) {
    console.log(`\nAuditing custom role: ${cr.namaRole} (${cr.kodeRole})`);
    for (const sp of sigPerms) {
      const [rp] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, cr.id),
            eq(rolePermissions.permissionId, sp.id)
          )
        )
        .limit(1);

      if (!rp) {
        // Missing row -> insert fail-closed FALSE
        await db.insert(rolePermissions).values({
          roleId: cr.id,
          permissionId: sp.id,
          diizinkan: false,
        });
        console.log(`  + Inserted missing fail-closed FALSE for ${sp.kodePermission}`);
      } else if (rp.diizinkan) {
        // Active -> force FALSE
        await db
          .update(rolePermissions)
          .set({ diizinkan: false, updatedAt: new Date() })
          .where(eq(rolePermissions.id, rp.id));
        console.log(`  ⚠️ Fixed active signature permission -> set to FALSE for ${sp.kodePermission}`);
      } else {
        console.log(`  ✓ ${sp.kodePermission}: FALSE (Aman)`);
      }
    }
  }

  console.log('\n=== MIGRATION SELESAI ===');
}

main().catch(console.error).finally(() => process.exit(0));
