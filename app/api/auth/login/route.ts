import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// POST /api/auth/user-login — FIXED to match the FIXED signup route
// Signup now stores the password in BOTH `password` and `password_hash`,
// and sets cookies `user_session` + `session` + `auth-token`.
// This login checks BOTH columns, plus bcrypt if the hash is a bcrypt hash,
// so a correct password never fails because it looked in the wrong column.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database is not configured (DATABASE_URL missing in Vercel).' }, { status: 500 });
    }
    const sql = neon(process.env.DATABASE_URL);
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 }); }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });

    // Make sure columns exist (safe if they already do) — so SELECT never 500s on an old table
    try {
      await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL, password TEXT, password_hash TEXT, role TEXT DEFAULT 'user', created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
    } catch (e: any) {
      return NextResponse.json({ success: false, message: 'Could not read users table: ' + (e.message || '') }, { status: 500 });
    }

    let rows: any[] = [];
    try {
      rows = await sql`SELECT id, name, email, password, password_hash, role, created_at FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    } catch (e: any) {
      return NextResponse.json({ success: false, message: 'Database lookup failed: ' + (e.message || '') }, { status: 500 });
    }
    if (!rows.length) {
      // Same message for "no such email" and "wrong password" — don't leak which one exists
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }
    const user = rows[0];

    // 1) Plain-text match (your admin + signup style: TRIM(password))
    const plain = String(user.password || '').trim();
    const hashCol = String(user.password_hash || '').trim();
    let ok = false;
    if (plain && password === plain) ok = true;
    if (!ok && hashCol && password === hashCol) ok = true; // signup stored plain in password_hash too
    // 2) Bcrypt match — only if password_hash looks like a bcrypt hash ($2a$ / $2b$)
    if (!ok && hashCol && (hashCol.startsWith('$2a$') || hashCol.startsWith('$2b$') || hashCol.startsWith('$2y$'))) {
      try {
        // bcryptjs is optional — if it is not installed, this just falls through
        const bcrypt: any = await import('bcryptjs').then((m: any) => m.default || m).catch(() => null);
        if (bcrypt && typeof bcrypt.compare === 'function') ok = await bcrypt.compare(password, hashCol);
      } catch { /* ignore — plain match above already tried */ }
    }
    // 3) Legacy: some old rows stored password with surrounding spaces
    if (!ok && plain && password.trim() === plain) ok = true;

    if (!ok) return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });

    const sessionData = { id: user.id, email: user.email, name: user.name, role: user.role || 'user', timestamp: Date.now() };
    const res = NextResponse.json({ success: true, message: 'Signed in.', user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' } });
    const cookieOpts: any = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' };
    // Same 3 cookies signup sets — whichever your middleware checks will be there
    res.cookies.set('user_session', JSON.stringify(sessionData), cookieOpts);
    res.cookies.set('session', JSON.stringify(sessionData), cookieOpts);
    res.cookies.set('auth-token', JSON.stringify(sessionData), cookieOpts);
    return res;
  } catch (error: any) {
    console.error('User login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed: ' + (error.message || 'server error') }, { status: 500 });
  }
}
