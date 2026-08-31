import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and migrating anggaran_pengajuan table...");

  await db.execute(sql`
    ALTER TABLE anggaran_pengajuan 
    ADD COLUMN IF NOT EXISTS detail_pengajuan jsonb;
  `);

  console.log("Migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
