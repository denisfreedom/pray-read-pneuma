import { neon } from '@neondatabase/serverless';

// Initialize the SQL client with DATABASE_URL
const sql = neon(process.env.DATABASE_URL!);

export default sql;
