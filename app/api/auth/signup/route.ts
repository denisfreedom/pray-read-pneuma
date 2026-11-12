import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// POST /api/auth/signup  — FIXED
// Why new users could not register:
// 1) Old route crashed when the `users` table did not exist / had different columns -> 500 HTML page.
//    The signup page then did `await response.json()` on HTML -> threw -> generic "An error occurred".
// 2) Old route returned the wrong shape / no cookie, so even a "success" never logged the user in.
// This route: creates the table if missing, checks duplicate email, inserts, returns
// { success:true, user } AND sets the session cookies the middleware / dashboard check.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database is not configured (DATABASE_URL missing in Vercel). Add it in Vercel > Settings > Environment Variables, then redeploy.' }, { status: 500 });
    }
    const sql = neon(process.env.DATABASE_URL);
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 }); }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name) return NextResponse.json({ success: false, message: 'Full name is required.' }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ success: false, message: 'Enter a valid email address.' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ success: false, message: 'Password must be at least 6 characters.' }, { status: 400 });

    // 1) Make sure the table exists — with BOTH password and password_hash columns,
    // so it works whether your login route compares plain `password` or `password_hash`.
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          password_hash TEXT,
          role TEXT DEFAULT 'user',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      // If an older users table exists without some columns, add them (safe if already there).
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
    } catch (e: any) {
      console.error('signup create-table error:', e);
      return NextResponse.json({ success: false, message: 'Could not create users table: ' + (e.message || 'database error') }, { status: 500 });
    }

    // 2) Duplicate check (case-insensitive) — the #1 real reason signups "fail" for returning users.
    let existing: any[] = [];
    try { existing = await sql`SELECT id FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`; }
    catch (e: any) { return NextResponse.json({ success: false, message: 'Database lookup failed: ' + (e.message || '') }, { status: 500 }); }
    if (existing.length) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists. Please Sign In instead.' }, { status: 409 });
    }

    // 3) Insert. Store plain `password` (matches your admin/user login style which compares
    // TRIM(password)) AND password_hash with the same value, so either login style works.
    let rows: any[] = [];
    try {
      rows = await sql`INSERT INTO users (name, email, password, password_hash, role) VALUES (${name}, ${email}, ${password}, ${password}, 'user') RETURNING id, name, email, role, created_at`;
    } catch (e: any) {
      console.error('signup insert error:', e);
      // Unique violation raced in between check + insert.
      if (String(e.message || '').includes('duplicate') || String(e.message || '').includes('unique')) {
        return NextResponse.json({ success: false, message: 'An account with this email already exists. Please Sign In instead.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, message: 'Could not create account: ' + (e.message || 'database error') }, { status: 500 });
    }
    const user = rows[0];
    if (!user) return NextResponse.json({ success: false, message: 'Account was not created. Please try again.' }, { status: 500 });

    const sessionData = { id: user.id, email: user.email, name: user.name, role: user.role || 'user', timestamp: Date.now() };
    const res = NextResponse.json({ success: true, message: 'Account created.', user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' } });
    // Set every cookie name your middleware / login might check. Extra cookies are harmless.
    const cookieOpts: any = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' };
    res.cookies.set('user_session', JSON.stringify(sessionData), cookieOpts);
    res.cookies.set('session', JSON.stringify(sessionData), cookieOpts);
    res.cookies.set('auth-token', JSON.stringify(sessionData), cookieOpts);
    return res;
  } catch (error: any) {
    console.error('Signup error:', error);
    // ALWAYS return JSON — never throw HTML, or the page shows a generic error.
    return NextResponse.json({ success: false, message: 'Signup failed: ' + (error.message || 'server error') }, { status: 500 });
  }
}
