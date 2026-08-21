import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB] DATABASE_URL is not set. Database queries will fail.');
}

// Lesson learned: prepare: false is mandatory for Supabase Transaction Pooler (Port 6543)
const client = postgres(connectionString || '', {
  prepare: false,
  ssl: 'require',
});

export const db = drizzle(client, { schema });
