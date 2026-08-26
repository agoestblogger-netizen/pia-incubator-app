import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("DATABASE_URL not found in env");
  process.exit(1);
}

const sql = postgres(connectionString);

async function main() {
  console.log("Migrating sprint_review and market_validation_report tables...");

  // 1. Create sprint_review table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS sprint_review (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sprint_id UUID NOT NULL REFERENCES sprint(id) ON DELETE CASCADE,
      tim_inovator_id UUID NOT NULL REFERENCES tim_inovator(id) ON DELETE CASCADE,
      sprint_number INTEGER NOT NULL,
      tanggal_review TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      ringkasan_pencapaian TEXT,
      demo_output TEXT,
      kendala_blocker TEXT,
      pembelajaran TEXT,
      rencana_tindak_lanjut TEXT,
      demo TEXT,
      feedback TEXT,
      value TEXT,
      questions TEXT,
      evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
      continue_items TEXT,
      stop_items TEXT,
      start_items TEXT,
      owner_target_sprint TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // 2. Ensure all columns exist in sprint_review
  const columns = [
    { name: "demo", type: "TEXT" },
    { name: "feedback", type: "TEXT" },
    { name: "value", type: "TEXT" },
    { name: "questions", type: "TEXT" },
    { name: "evidence", type: "JSONB NOT NULL DEFAULT '[]'::jsonb" },
    { name: "continue_items", type: "TEXT" },
    { name: "stop_items", type: "TEXT" },
    { name: "start_items", type: "TEXT" },
    { name: "owner_target_sprint", type: "TEXT" },
    { name: "ringkasan_pencapaian", type: "TEXT" },
    { name: "demo_output", type: "TEXT" },
    { name: "kendala_blocker", type: "TEXT" },
    { name: "pembelajaran", type: "TEXT" },
    { name: "rencana_tindak_lanjut", type: "TEXT" },
  ];

  for (const col of columns) {
    await sql.unsafe(`ALTER TABLE sprint_review ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  }

  // 3. Create indices
  await sql`CREATE INDEX IF NOT EXISTS sprint_review_tim_idx ON sprint_review(tim_inovator_id);`;
  await sql`CREATE INDEX IF NOT EXISTS sprint_review_sprint_idx ON sprint_review(sprint_id);`;

  console.log("Migration completed successfully!");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
