import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { roles } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('--- Migrasi Koreksi Scope Role Coach ke per_tim ---');
  await db
    .update(roles)
    .set({
      scope: 'per_tim',
      updatedAt: new Date(),
    })
    .where(eq(roles.kodeRole, 'coach'));

  console.log('✓ Role coach berhasil di-update ke scope: per_tim\n');

  const allRoles = await db.select().from(roles);
  console.log('Status Terkini Tabel Roles:');
  for (const r of allRoles) {
    console.log(`• ${r.kodeRole.padEnd(16)}: ${r.scope}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
