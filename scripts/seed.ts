import { db } from '../lib/db';
import { roles, permissions, rolePermissions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// 8 Default Roles
const DEFAULT_ROLES = [
  {
    kodeRole: 'admin_ic',
    namaRole: 'Admin Innovation Center',
    deskripsi: 'Akses penuh ke seluruh sistem, pengelolaan user, hak akses, dan tata kelola inovasi secara global.',
    scope: 'global',
    isDefault: true,
  },
  {
    kodeRole: 'sponsor',
    namaRole: 'Sponsor',
    deskripsi: 'Sponsor program inovasi yang memantau progres dan memberikan dukungan strategis.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'promotor',
    namaRole: 'Promotor',
    deskripsi: 'Promotor inovasi yang mendampingi dan memonitor jalannya validasi pasar dan keuangan.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'project_owner',
    namaRole: 'Project Owner',
    deskripsi: 'Penanggung jawab utama proyek inovasi dari tim inovator.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'inisiator',
    namaRole: 'Inisiator',
    deskripsi: 'Pencetus ide dan penggerak utama validasi solusi pelanggan.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'co_creator',
    namaRole: 'Co-creator',
    deskripsi: 'Anggota tim yang bersama-sama mengeksekusi backlog, sprint, dan riset pengguna.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'coach',
    namaRole: 'Innovation Coach',
    deskripsi: 'Pelatih metodologi inovasi yang membimbing penyusunan charter dan eksperimen validasi.',
    scope: 'per_tim',
    isDefault: true,
  },
  {
    kodeRole: 'sme',
    namaRole: 'Collaborator / SME',
    deskripsi: 'Subject Matter Expert yang memberikan masukan teknis dan review pada kartu kanban.',
    scope: 'per_tim',
    isDefault: true,
  },
];

// Default Permissions
const DEFAULT_PERMISSIONS = [
  // Kelola User & Role
  { kodePermission: 'user.manage', modul: 'kelola_user', deskripsi: 'Mengelola pengguna dan hak akses role' },
  { kodePermission: 'user.view', modul: 'kelola_user', deskripsi: 'Melihat daftar pengguna' },

  // Tim Inovator
  { kodePermission: 'tim.manage', modul: 'tim_inovator', deskripsi: 'Membuat dan mengedit tim inovator' },
  { kodePermission: 'tim.edit', modul: 'tim_inovator', deskripsi: 'Mengedit data tim inovator' },
  { kodePermission: 'tim.view', modul: 'tim_inovator', deskripsi: 'Melihat data tim inovator' },

  // Charter
  { kodePermission: 'charter.manage', modul: 'charter', deskripsi: 'Akses penuh charter' },
  { kodePermission: 'charter.edit', modul: 'charter', deskripsi: 'Menyusun dan mengedit charter' },
  { kodePermission: 'charter.view', modul: 'charter', deskripsi: 'Melihat dokumen charter' },

  // Kanban Board
  { kodePermission: 'kanban.manage', modul: 'kanban', deskripsi: 'Akses penuh kanban board dan timeline' },
  { kodePermission: 'kanban.edit', modul: 'kanban', deskripsi: 'Menambah dan menggeser kartu kanban' },
  { kodePermission: 'kanban.comment', modul: 'kanban', deskripsi: 'Memberikan komentar pada kartu kanban' },
  { kodePermission: 'kanban.view', modul: 'kanban', deskripsi: 'Melihat board kanban dan timeline' },

  // Customer Validation
  { kodePermission: 'cust_val.manage', modul: 'customer_validation', deskripsi: 'Akses penuh customer validation' },
  { kodePermission: 'cust_val.edit', modul: 'customer_validation', deskripsi: 'Menyusun plan dan report customer validation' },
  { kodePermission: 'cust_val.view', modul: 'customer_validation', deskripsi: 'Melihat customer validation' },

  // Market Validation
  { kodePermission: 'market_val.manage', modul: 'market_validation', deskripsi: 'Akses penuh market validation' },
  { kodePermission: 'market_val.edit', modul: 'market_validation', deskripsi: 'Menyusun plan dan report market validation' },
  { kodePermission: 'market_val.view', modul: 'market_validation', deskripsi: 'Melihat market validation' },

  // RAB & LPJ
  { kodePermission: 'anggaran.manage', modul: 'rab_lpj', deskripsi: 'Akses penuh pengajuan anggaran & LPJ' },
  { kodePermission: 'anggaran.submit', modul: 'rab_lpj', deskripsi: 'Mengajukan anggaran & LPJ' },
  { kodePermission: 'anggaran.view', modul: 'rab_lpj', deskripsi: 'Melihat pengajuan anggaran & LPJ' },

  // Forum Manajemen Inovasi (FMI)
  { kodePermission: 'fmi.manage', modul: 'fmi', deskripsi: 'Menginput notulensi dan keputusan FMI' },
  { kodePermission: 'fmi.view', modul: 'fmi', deskripsi: 'Melihat hasil FMI dan penghargaan' },

  // Dossier Arsip PIA
  { kodePermission: 'dossier.view', modul: 'dossier', deskripsi: 'Melihat arsip proposal asli PIA' },
];

// Default Matrix Access: Role -> List of Allowed Permission Codes
const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  admin_ic: [
    'user.manage', 'user.view',
    'tim.manage', 'tim.edit', 'tim.view',
    'charter.manage', 'charter.edit', 'charter.view',
    'kanban.manage', 'kanban.edit', 'kanban.comment', 'kanban.view',
    'cust_val.manage', 'cust_val.edit', 'cust_val.view',
    'market_val.manage', 'market_val.edit', 'market_val.view',
    'anggaran.manage', 'anggaran.submit', 'anggaran.view',
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
    'anggaran.manage', 'anggaran.submit', 'anggaran.view',
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

async function main() {
  console.log('--- SEEDING ROLES & PERMISSIONS ---');

  // 1. Seed Roles
  console.log('Seeding 8 default roles...');
  for (const r of DEFAULT_ROLES) {
    const [existing] = await db.select().from(roles).where(eq(roles.kodeRole, r.kodeRole)).limit(1);
    if (!existing) {
      await db.insert(roles).values(r);
      console.log(`+ Role created: ${r.namaRole} (${r.kodeRole})`);
    } else {
      console.log(`= Role exists: ${r.namaRole}`);
    }
  }

  // 2. Seed Permissions
  console.log('\nSeeding permissions...');
  for (const p of DEFAULT_PERMISSIONS) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.kodePermission, p.kodePermission)).limit(1);
    if (!existing) {
      await db.insert(permissions).values(p);
      console.log(`+ Permission created: ${p.kodePermission}`);
    }
  }

  // 3. Seed Role Permissions Matrix
  console.log('\nSeeding role permissions matrix...');
  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);

  const roleMap = new Map(allRoles.map(r => [r.kodeRole, r.id]));
  const permMap = new Map(allPermissions.map(p => [p.kodePermission, p.id]));

  for (const [kodeRole, permList] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleId = roleMap.get(kodeRole);
    if (!roleId) continue;

    for (const permCode of permList) {
      const permissionId = permMap.get(permCode);
      if (!permissionId) continue;

      try {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId,
          diizinkan: true,
        }).onConflictDoNothing();
      } catch (err) {
        // ignore duplicate
      }
    }
  }

  console.log('\n✅ Seeding roles & permissions selesai!');
}

main().then(() => process.exit(0)).catch(e => { console.error('Seed error:', e); process.exit(1); });
