import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production.local' });

import { db } from '../lib/db';
import { roles, permissions, rolePermissions, users, timInovator, userRoleTim, anggotaTim } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

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

  // Import Calon Peserta
  { kodePermission: 'import.execute', modul: 'tim_inovator', deskripsi: 'Mengimpor calon peserta dari PIA Curation' },

  // Reset Data System
  { kodePermission: 'system.reset_data', modul: 'system', deskripsi: 'Mereset data tim dan modul inkubasi' },
];

const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  admin_ic: [
    'user.manage', 'user.view',
    'tim.manage', 'tim.edit', 'tim.view',
    'import.execute',
    'system.reset_data',
    'charter.manage', 'charter.edit', 'charter.view',
    'kanban.manage', 'kanban.edit', 'kanban.comment', 'kanban.view',
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

// Seed Users Definition
const SAMPLE_USERS = [
  {
    email: 'admin.ic@pegadaian.co.id',
    password: 'Password123!',
    nama: 'Admin Innovation Center',
    roleKode: 'admin_ic',
    isGlobal: true,
  },
  {
    email: 'admin@pegadaian.co.id',
    password: 'password123',
    nama: 'Administrator Utama',
    roleKode: 'admin_ic',
    isGlobal: true,
  },
  {
    email: 'project.owner@pegadaian.co.id',
    password: 'Password123!',
    nama: 'Budi Santoso (Project Owner)',
    roleKode: 'project_owner',
    isGlobal: false,
    jabatan: 'Head of Product Development',
    unitKerja: 'Divisi Inovasi & Transformasi Digital',
  },
  {
    email: 'inisiator@pegadaian.co.id',
    password: 'Password123!',
    nama: 'Siti Rahmawati (Inisiator)',
    roleKode: 'inisiator',
    isGlobal: false,
    jabatan: 'Senior Business Analyst',
    unitKerja: 'Divisi Bisnis Emas',
  },
  {
    email: 'sme.reviewer@pegadaian.co.id',
    password: 'Password123!',
    nama: 'Dr. Hendra Gunawan (Collaborator / SME)',
    roleKode: 'sme',
    isGlobal: false,
    jabatan: 'Principal Enterprise Architect',
    unitKerja: 'Divisi IT Architecture & Security',
  },
  {
    email: 'coach@pegadaian.co.id',
    password: 'Password123!',
    nama: 'Dewi Lestari (Innovation Coach)',
    roleKode: 'coach',
    isGlobal: false,
    jabatan: 'Lead Innovation Facilitator',
    unitKerja: 'Innovation Center',
  },
];

async function main() {
  console.log('=== SEEDING PIA INCUBATOR SYSTEM ===\n');

  // 1. Seed Roles
  console.log('1. Seeding 8 default roles...');
  for (const r of DEFAULT_ROLES) {
    const [existing] = await db.select().from(roles).where(eq(roles.kodeRole, r.kodeRole)).limit(1);
    if (!existing) {
      await db.insert(roles).values(r);
      console.log(`  + Role created: ${r.namaRole} (${r.kodeRole})`);
    } else {
      console.log(`  = Role exists: ${r.namaRole}`);
    }
  }

  // 2. Seed Permissions
  console.log('\n2. Seeding permissions...');
  for (const p of DEFAULT_PERMISSIONS) {
    const [existing] = await db.select().from(permissions).where(eq(permissions.kodePermission, p.kodePermission)).limit(1);
    if (!existing) {
      await db.insert(permissions).values(p);
      console.log(`  + Permission created: ${p.kodePermission}`);
    }
  }

  // 3. Seed Role Permissions Matrix
  console.log('\n3. Seeding role permissions matrix...');
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

  // 4. Check Existing Teams
  console.log('\n4. Checking Teams in database...');
  const existingTeams = await db.select().from(timInovator);
  console.log(`  * Total existing teams in database: ${existingTeams.length}`);

  // 5. Seed Users into Supabase Auth & Database
  console.log('\n5. Seeding Users to Supabase Auth & Database...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local');
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const u of SAMPLE_USERS) {
    let authUserId: string | null = null;

    // Check if user exists in Supabase Auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error(`  x Error listing users: ${listError.message}`);
    }

    const existingAuthUser = listData?.users.find(user => user.email === u.email);

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      // Update password to ensure it's synced
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: u.password,
        email_confirm: true,
        user_metadata: { nama: u.nama },
      });
      console.log(`  = Auth user exists (updated password): ${u.email}`);
    } else {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nama: u.nama },
      });

      if (createError) {
        console.error(`  x Failed creating auth user ${u.email}:`, createError.message);
        continue;
      }
      authUserId = createData.user.id;
      console.log(`  + Auth user created: ${u.email}`);
    }

    if (!authUserId) continue;

    // Upsert into users table
    const [existingDbUser] = await db.select().from(users).where(eq(users.id, authUserId)).limit(1);
    if (!existingDbUser) {
      // Also check if email exists with different ID
      const [emailUser] = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
      if (emailUser) {
        await db.delete(users).where(eq(users.email, u.email));
      }

      await db.insert(users).values({
        id: authUserId,
        email: u.email,
        nama: u.nama,
        statusAktif: true,
      });
      console.log(`  + DB user created: ${u.nama}`);
    } else {
      await db.update(users).set({ nama: u.nama, statusAktif: true }).where(eq(users.id, authUserId));
      console.log(`  = DB user exists: ${u.nama}`);
    }

    // Link Global Role
    if (u.isGlobal) {
      const targetRoleId = roleMap.get(u.roleKode);
      if (targetRoleId) {
        const [existingMapping] = await db.select().from(userRoleTim).where(
          and(
            eq(userRoleTim.userId, authUserId),
            eq(userRoleTim.roleId, targetRoleId)
          )
        ).limit(1);

        if (!existingMapping) {
          await db.insert(userRoleTim).values({
            userId: authUserId,
            roleId: targetRoleId,
            timInovatorId: null,
          });
          console.log(`  + Assigned global role ${u.roleKode} to ${u.email}`);
        } else {
          console.log(`  = Global role mapping exists: ${u.roleKode} for ${u.email}`);
        }
      }
    }
  }

  console.log('\n========================================');
  console.log('✅ ALL SEEDING & USER CREATION COMPLETED!');
  console.log('========================================');
}

main().then(() => process.exit(0)).catch(e => { console.error('Seed error:', e); process.exit(1); });
