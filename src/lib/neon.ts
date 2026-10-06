import { Pool } from "pg";

declare global { var neonPool: Pool | undefined; }
export function getNeonPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquante");
  if (!global.neonPool) global.neonPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } });
  return global.neonPool;
}
let schemaReady: Promise<void> | undefined;
export async function ensureNeonSchema() { if (!schemaReady) schemaReady = getNeonPool().query(`create table if not exists workshops (id text primary key, state jsonb not null, updated_at timestamptz not null default now())`).then(() => undefined); await schemaReady; }
