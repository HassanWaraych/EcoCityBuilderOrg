import pg from "pg";
import type { PoolClient } from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const useSsl =
  /sslmode=require/i.test(connectionString) ||
  /supabase\.co/i.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  family: 4, // <-- force IPv4
});
/**
 * Get a client from the pool. Use for single queries or pass to repos.
 * Remember to release the client when done (client.release() or use in a callback).
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Run the initial schema (001_init.sql) against the database.
 * Safe to call on startup; tables use IF NOT EXISTS where applicable.
 * For a fresh DB you run the full SQL once (e.g. via Supabase SQL Editor);
 * this helper is for automation or local dev.
 */
export async function runMigrations(): Promise<void> {
  const client = await getClient();
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const sqlPath = join(currentDir, "..", "sql", "001_init.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    await client.query(sql);
  } finally {
    client.release();
  }
}

/**
 * Test that the database is reachable (e.g. for health checks).
 */
export async function ping(): Promise<boolean> {
  try {
    const res = await pool.query("SELECT 1 as ok");
    return res.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}
