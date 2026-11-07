import { neon } from '@neondatabase/serverless';

// Support all names Neon / Vercel might use
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  '';

if (!connectionString) {
  console.error('❌ DATABASE_URL is MISSING in Vercel Environment Variables. All APIs will fail.');
} else {
  // Don't log the full string — just confirm it exists
  console.log('✅ DATABASE_URL found, length:', connectionString.length);
}

// Never throw on import — let each API catch the error and use its fallback
// If we throw here, EVERY route that imports sql crashes instantly
const sql: any = connectionString
  ? neon(connectionString)
  : async () => {
      throw new Error('DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables');
    };

export default sql;
