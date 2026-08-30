import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('@/lib/db');
  const { roles } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('--- Sinkronisasi Scope Role Coach ke Global ---');
  await db
    .update(roles)
    .set({
      scope: 'global',
      updatedAt: new Date(),
    })
    .where(eq(roles.kodeRole, 'coach'));

  console.log('✓ Role coach berhasil di-update ke scope: global');

  const allRoles = await db.select().from(roles);
  for (const r of allRoles) {
    console.log(`• ${r.kodeRole.padEnd(16)}: ${r.scope}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
