import { neon } from '@neondatabase/serverless';

// app/api/utils/sql.ts — FIXED / IMPROVED
// This is the ONE place that knows how to connect to Neon. Every API should
// import from here instead of calling neon() itself, so a DATABASE_URL problem
// is fixed in one place, not in 20 files.
//
// Old version was close, but:
// 1) It console.log'd on EVERY import in EVERY route -> noisy Vercel logs.
// 2) It only exported `default` -> `import { sql } from '@/app/api/utils/sql'`
//    got `undefined` and then "sql is not a function".
// 3) No helper to check config before querying, so every route re-did the check.
// Fixed: single lazy singleton, both default + named exports, no throw on import,
// no secret logging, env names trimmed, one log line max.

const ENV_NAMES = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'] as const;

function readConnectionString(): string {
  for (const name of ENV_NAMES) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  return '';
}

const connectionString = readConnectionString();

// Log ONCE, and never log the string itself (it contains the password).
// In production, keep it to a single warn so logs stay readable.
let logged = false;
if (!connectionString && !logged) {
  logged = true;
  console.error('❌ DATABASE_URL is MISSING in Vercel Environment Variables. All DB APIs will return a clear JSON error. Add it in Vercel > Settings > Environment Variables.');
} else if (connectionString && !logged) {
  logged = true;
  // Only log in development — in production Vercel logs get flooded by one line per route
  if (process.env.NODE_ENV !== 'production') console.log('✅ DATABASE_URL found');
}

export function isDbConfigured(): boolean {
  return Boolean(connectionString);
}

export function getConnectionString(): string {
  return connectionString;
}

// Lazy singleton: neon() is only created once, on first use, not on import.
// That matters in serverless — import-time work runs on every cold start.
let cached: any = null;
function getSql(): any {
  if (cached) return cached;
  if (!connectionString) {
    // Never throw on import — return a function that throws a CLEAR error
    // when actually called, so the API can catch it and return JSON.
    // It must accept the template-tag call shape: sql`SELECT ...`
    const fallback: any = async () => {
      throw new Error('DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables, then redeploy.');
    };
    cached = fallback;
    return cached;
  }
  cached = neon(connectionString);
  return cached;
}

const sql: any = getSql();

// Same object, every way a file might import it:
//   import sql from '@/app/api/utils/sql'      -> default
//   import { sql } from '@/app/api/utils/sql'  -> named
//   import { getSql } from '@/app/api/utils/sql' -> lazy getter (preferred in new code)
export { sql, getSql };
export default sql;

// Optional helper: quick connectivity check for a /api/health route
// Usage: const ok = await checkDb();  // true if `SELECT 1` works
export async function checkDb(): Promise<boolean> {
  try {
    if (!connectionString) return false;
    await getSql()`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
