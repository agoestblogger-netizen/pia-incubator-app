import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL!;

async function migrate() {
  const sql = postgres(connectionString, { max: 1, ssl: 'require', prepare: false });

  console.log("Checking and adding tipe_kartu column to kanban_card...");
  await sql.unsafe(`
    ALTER TABLE kanban_card 
    ADD COLUMN IF NOT EXISTS tipe_kartu text NOT NULL DEFAULT 'backlog';
  `);

  console.log("Creating index on tipe_kartu...");
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS kanban_card_tipe_kartu_idx ON kanban_card(tipe_kartu);
  `);

  console.log("Migration completed successfully!");
  await sql.end();
}

migrate().catch(console.error);
