import { db } from '../lib/db';
import { roles, permissions, rolePermissions, users, userRoleTim, timInovator } from '../lib/db/schema';
import { hasPermission, UserProfile } from '../lib/auth/rbac';
import { eq } from 'drizzle-orm';

async function runRbacTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 PENGUJIAN FUNGSIONAL LOGIC RBAC GUARD (4 SKENARIO PRD)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Pastikan roles dan permissions sudah ter-seed
  const allRoles = await db.select().from(roles);
  const allPerms = await db.select().from(permissions);
  const allRP = await db.select().from(rolePermissions);

  console.log(`✓ Data master di database: ${allRoles.length} Roles, ${allPerms.length} Permissions, ${allRP.length} Role-Permission Mappings.\n`);

  const timAId = '11111111-1111-1111-1111-111111111111';
  const timBId = '22222222-2222-2222-2222-222222222222';

  // Skenario 1: User dengan role Collaborator/SME di Tim A
  const userSme: UserProfile = {
    id: 'user-sme-001',
    nama: 'Budi (Collaborator / SME)',
    email: 'budi.sme@pegadaian.co.id',
    statusAktif: true,
    avatarUrl: null,
    globalRoles: [],
    timRoles: [{ timId: timAId, roleCode: 'sme', roleName: 'Collaborator / SME' }],
  };

  // Skenario 2: User dengan role Co-creator di Tim A
  const userCoCreator: UserProfile = {
    id: 'user-cocreator-002',
    nama: 'Siti (Co-creator)',
    email: 'siti.cocreator@pegadaian.co.id',
    statusAktif: true,
    avatarUrl: null,
    globalRoles: [],
    timRoles: [{ timId: timAId, roleCode: 'co_creator', roleName: 'Co-creator' }],
  };

  // Skenario 3: User Project Owner di Tim A
  const userPoTimA: UserProfile = {
    id: 'user-po-003',
    nama: 'Rian (Project Owner Tim A)',
    email: 'rian.po@pegadaian.co.id',
    statusAktif: true,
    avatarUrl: null,
    globalRoles: [],
    timRoles: [{ timId: timAId, roleCode: 'project_owner', roleName: 'Project Owner' }],
  };

  // Skenario 4: User Admin Innovation Center (Global)
  const userAdmin: UserProfile = {
    id: 'user-admin-004',
    nama: 'Admin IC Pusat',
    email: 'admin.ic@pegadaian.co.id',
    statusAktif: true,
    avatarUrl: null,
    globalRoles: ['admin_ic'],
    timRoles: [],
  };

  let allPassed = true;

  // TEST 1: SME mencoba submit anggaran di Tim A (Harus DITOLAK)
  console.log('-----------------------------------------------------------------------');
  console.log('📌 SKENARIO 1: Collaborator / SME panggil submitAnggaranAction di Tim A');
  const test1 = await hasPermission(userSme, 'anggaran.submit', timAId);
  console.log(`   User: ${userSme.nama}`);
  console.log(`   Role: SME di Tim A`);
  console.log(`   Aksi: anggaran.submit`);
  console.log(`   Hasil: ${test1 ? '❌ DIIZINKAN (GAGAL)' : '✅ DITOLAK / FORBIDDEN (SUKSES)'}`);
  if (test1 !== false) allPassed = false;

  // TEST 2: Co-creator mencoba edit Charter di Tim A (Harus DITOLAK karena Co-creator cuma View)
  console.log('\n-----------------------------------------------------------------------');
  console.log('📌 SKENARIO 2: Co-creator panggil saveCharterAction di Tim A');
  const test2 = await hasPermission(userCoCreator, 'charter.edit', timAId);
  console.log(`   User: ${userCoCreator.nama}`);
  console.log(`   Role: Co-creator di Tim A`);
  console.log(`   Aksi: charter.edit`);
  console.log(`   Hasil: ${test2 ? '❌ DIIZINKAN (GAGAL)' : '✅ DITOLAK / FORBIDDEN (SUKSES)'}`);
  if (test2 !== false) allPassed = false;

  // TEST 3: Project Owner Tim A mencoba edit Charter di Tim B (Harus DITOLAK karena beda Tim)
  console.log('\n-----------------------------------------------------------------------');
  console.log('📌 SKENARIO 3: Project Owner Tim A panggil saveCharterAction untuk Tim B');
  const test3 = await hasPermission(userPoTimA, 'charter.edit', timBId);
  console.log(`   User: ${userPoTimA.nama}`);
  console.log(`   Role: PO di Tim A (Mencoba akses Tim B)`);
  console.log(`   Aksi: charter.edit di Tim B`);
  console.log(`   Hasil: ${test3 ? '❌ DIIZINKAN (GAGAL)' : '✅ DITOLAK / FORBIDDEN (SUKSES)'}`);
  if (test3 !== false) allPassed = false;

  // TEST 3b: Project Owner Tim A panggil saveCharterAction di Tim A miliknya sendiri (Harus DIIZINKAN)
  console.log('\n   [Verifikasi Valid]: PO Tim A panggil charter.edit di Tim A miliknya sendiri:');
  const test3b = await hasPermission(userPoTimA, 'charter.edit', timAId);
  console.log(`   Hasil: ${test3b ? '✅ DIIZINKAN / GRANTED (SUKSES)' : '❌ DITOLAK (GAGAL)'}`);
  if (test3b !== true) allPassed = false;

  // TEST 4: Admin Innovation Center panggil aksi 1, 2, 3 di Tim A maupun Tim B (Harus DIIZINKAN SEMUA)
  console.log('\n-----------------------------------------------------------------------');
  console.log('📌 SKENARIO 4: Admin Innovation Center (Global Access)');
  const test4a = await hasPermission(userAdmin, 'anggaran.submit', timAId);
  const test4b = await hasPermission(userAdmin, 'charter.edit', timAId);
  const test4c = await hasPermission(userAdmin, 'charter.edit', timBId);
  const test4d = await hasPermission(userAdmin, 'user.manage');

  console.log(`   User: ${userAdmin.nama} (Global Role: admin_ic)`);
  console.log(`   - Akses anggaran.submit di Tim A : ${test4a ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses charter.edit di Tim A    : ${test4b ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses charter.edit di Tim B    : ${test4c ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses user.manage (Kelola RBAC): ${test4d ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);

  if (!test4a || !test4b || !test4c || !test4d) allPassed = false;

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 SEMUA 4 SKENARIO PENGUJIAN RBAC GUARD LOLOS 100% SECARA AKURAT!');
  } else {
    console.log('❌ ADA SKENARIO YANG GAGAL!');
  }
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

runRbacTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
