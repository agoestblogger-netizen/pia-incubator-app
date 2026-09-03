import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB] DATABASE_URL is not set. Database queries will fail.');
}

// Global singleton pattern to prevent connection exhaustion in Next.js dev hot reloading
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Lesson learned: prepare: false is mandatory for Supabase Transaction Pooler (Port 6543)
const client =
  globalForDb.conn ??
  postgres(connectionString || '', {
    prepare: false,
    ssl: 'require',
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
  });

globalForDb.conn = client;

export const db = drizzle(client, { schema });
