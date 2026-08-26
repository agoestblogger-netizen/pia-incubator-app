import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and migrating kanban_subtask table...");

  await db.execute(sql`
    ALTER TABLE kanban_subtask 
    ADD COLUMN IF NOT EXISTS attachment_data jsonb DEFAULT '[]'::jsonb;
  `);

  console.log("Migration completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
