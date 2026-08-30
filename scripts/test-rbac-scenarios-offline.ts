// =============================================================================
// OFFLINE RBAC LOGIC VALIDATION TEST (PRD SCENARIOS 1 - 4)
// =============================================================================

const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  admin_ic: [
    'user.manage', 'user.create', 'user.edit_name', 'user.view',
    'tim.manage', 'tim.edit', 'tim.view',
    'charter.manage', 'charter.edit', 'charter.view',
    'kanban.manage', 'sprint.manage_count', 'kanban.edit', 'kanban.comment', 'kanban.view',
    'cust_val.manage', 'cust_val.edit', 'cust_val.view',
    'market_val.manage', 'market_val.edit', 'market_val.view',
    'anggaran.manage', 'anggaran.view',
    'fmi.manage', 'fmi.view',
    'dossier.view'
  ],
  divisi_ic: [
    'tim.view',
    'charter.manage', 'charter.view',
    'kanban.view',
    'cust_val.view',
    'market_val.manage', 'market_val.view',
    'anggaran.manage', 'anggaran.view',
    'fmi.manage', 'fmi.view',
    'dossier.view'
  ],
  sponsor: [
    'tim.view', 'charter.view', 'kanban.view',
    'cust_val.view', 'market_val.view',
    'fmi.view', 'dossier.view'
  ],
  promotor: [
    'tim.view', 'charter.view', 'kanban.view',
    'cust_val.view', 'market_val.edit', 'market_val.view',
    'anggaran.view', 'fmi.view', 'dossier.view'
  ],
  project_owner: [
    'tim.edit', 'tim.view',
    'charter.edit', 'charter.view',
    'kanban.manage', 'kanban.edit', 'kanban.view',
    'cust_val.edit', 'cust_val.view',
    'market_val.manage', 'market_val.edit', 'market_val.view',
    'anggaran.submit', 'anggaran.view',
    'fmi.view', 'dossier.view'
  ],
  inisiator: [
    'tim.view',
    'charter.edit', 'charter.view',
    'kanban.edit', 'kanban.view',
    'cust_val.manage', 'cust_val.edit', 'cust_val.view',
    'market_val.edit', 'market_val.view',
    'fmi.view', 'dossier.view'
  ],
  co_creator: [
    'tim.view',
    'charter.view',
    'kanban.edit', 'kanban.view',
    'cust_val.edit', 'cust_val.view',
    'market_val.edit', 'market_val.view',
    'fmi.view', 'dossier.view'
  ],
  coach: [
    'tim.view',
    'charter.edit', 'charter.view',
    'kanban.edit', 'kanban.view',
    'cust_val.edit', 'cust_val.view',
    'market_val.edit', 'market_val.view',
    'anggaran.view', 'fmi.view', 'dossier.view'
  ],
  sme: [
    'tim.view',
    'charter.view',
    'kanban.comment', 'kanban.view',
    'cust_val.view', 'market_val.view',
    'fmi.view', 'dossier.view'
  ],
};

type UserProfile = {
  id: string;
  nama: string;
  globalRoles: string[];
  timRoles: { timId: string; roleCode: string }[];
};

function evaluatePermission(
  user: UserProfile,
  permissionCode: string,
  targetTimId?: string
): boolean {
  // 1. Admin IC has global access
  if (user.globalRoles.includes('admin_ic')) return true;

  // 2. Resolve active roles for the target context
  const activeRoles: string[] = [...user.globalRoles];
  if (targetTimId) {
    user.timRoles
      .filter((tr) => tr.timId === targetTimId)
      .forEach((tr) => activeRoles.push(tr.roleCode));
  }

  if (activeRoles.length === 0) return false;

  // 3. Check matrix permissions
  for (const roleCode of activeRoles) {
    const allowedPerms = ROLE_PERMISSION_MATRIX[roleCode] || [];
    if (allowedPerms.includes(permissionCode)) {
      return true;
    }
  }

  return false;
}

function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 HASIL PENGUJIAN LOGIC RBAC GUARD (4 SKENARIO PRD)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const timA = 'tim-inovasi-001-sigap';
  const timB = 'tim-inovasi-002-emas';

  // 1. User SME di Tim A
  const userSme: UserProfile = {
    id: 'u-1',
    nama: 'Budi (Collaborator / SME)',
    globalRoles: [],
    timRoles: [{ timId: timA, roleCode: 'sme' }],
  };

  // 2. User Co-creator di Tim A
  const userCoCreator: UserProfile = {
    id: 'u-2',
    nama: 'Siti (Co-creator)',
    globalRoles: [],
    timRoles: [{ timId: timA, roleCode: 'co_creator' }],
  };

  // 3. User Project Owner di Tim A
  const userPoTimA: UserProfile = {
    id: 'u-3',
    nama: 'Rian (Project Owner Tim A)',
    globalRoles: [],
    timRoles: [{ timId: timA, roleCode: 'project_owner' }],
  };

  // 4. User Admin Innovation Center (Global)
  const userAdmin: UserProfile = {
    id: 'u-4',
    nama: 'Admin Innovation Center',
    globalRoles: ['admin_ic'],
    timRoles: [],
  };

  let allPassed = true;

  // SKENARIO 1
  console.log('📌 SKENARIO 1: Collaborator / SME memanggil submitAnggaranAction di Tim A');
  const res1 = evaluatePermission(userSme, 'anggaran.submit', timA);
  console.log(`   User      : ${userSme.nama}`);
  console.log(`   Permission: anggaran.submit pada ${timA}`);
  console.log(`   Hasil     : ${res1 ? '❌ DIIZINKAN (FAIL)' : '✅ DITOLAK / FORBIDDEN (PASS)'}`);
  if (res1 !== false) allPassed = false;

  // SKENARIO 2
  console.log('\n📌 SKENARIO 2: Co-creator memanggil saveCharterAction di Tim A');
  const res2 = evaluatePermission(userCoCreator, 'charter.edit', timA);
  console.log(`   User      : ${userCoCreator.nama}`);
  console.log(`   Permission: charter.edit pada ${timA}`);
  console.log(`   Hasil     : ${res2 ? '❌ DIIZINKAN (FAIL)' : '✅ DITOLAK / FORBIDDEN (PASS)'}`);
  if (res2 !== false) allPassed = false;

  // SKENARIO 3
  console.log('\n📌 SKENARIO 3: Project Owner Tim A memanggil saveCharterAction untuk Tim B (Beda Tim)');
  const res3 = evaluatePermission(userPoTimA, 'charter.edit', timB);
  console.log(`   User      : ${userPoTimA.nama}`);
  console.log(`   Permission: charter.edit pada ${timB}`);
  console.log(`   Hasil     : ${res3 ? '❌ DIIZINKAN (FAIL)' : '✅ DITOLAK / FORBIDDEN (PASS)'}`);
  if (res3 !== false) allPassed = false;

  console.log('   [Verifikasi]: PO Tim A panggil charter.edit di Tim A miliknya sendiri:');
  const res3b = evaluatePermission(userPoTimA, 'charter.edit', timA);
  console.log(`   Hasil     : ${res3b ? '✅ DIIZINKAN / GRANTED (PASS)' : '❌ DITOLAK (FAIL)'}`);
  if (res3b !== true) allPassed = false;

  // SKENARIO 4
  console.log('\n📌 SKENARIO 4: Admin Innovation Center (Global Full Access)');
  const res4a = evaluatePermission(userAdmin, 'anggaran.submit', timA);
  const res4b = evaluatePermission(userAdmin, 'charter.edit', timA);
  const res4c = evaluatePermission(userAdmin, 'charter.edit', timB);
  const res4d = evaluatePermission(userAdmin, 'user.manage');

  console.log(`   User      : ${userAdmin.nama}`);
  console.log(`   - Akses submitAnggaranAction di Tim A : ${res4a ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses saveCharterAction di Tim A    : ${res4b ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses saveCharterAction di Tim B    : ${res4c ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);
  console.log(`   - Akses user.manage (Kelola RBAC)     : ${res4d ? '✅ DIIZINKAN' : '❌ DITOLAK'}`);

  if (!res4a || !res4b || !res4c || !res4d) allPassed = false;

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 SEMUA 4 SKENARIO PENGUJIAN LOGIC RBAC GUARD TERBUKTI AKURAT 100%!');
  } else {
    console.log('❌ ADA SKENARIO YANG GAGAL!');
  }
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

runTests();
