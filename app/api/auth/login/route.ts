import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/auth/login — THE route app/login/page.tsx calls.
// Your page expects: { success, admin } + setAdmin(data.admin) + redirect.
// This route MUST agree with /api/auth/update-password (same DB helper,
// same password check), otherwise a password saved in Settings can never log in.
//
// Rules:
//  1) Same DB helper as update-password: @/app/api/utils/sql (DATABASE_URL).
//  2) Password check: plain-text match FIRST (update-password saves plain text),
//     then bcrypt match if the stored value is a $2a$/$2b$ hash (old rows).
//  3) admin123 fallback ONLY if there is NO admins row at all. If a row exists,
//     admin123 must NOT bypass it — otherwise you can never tell which password
//     is actually working, and admin123 stays live forever after you change it.
//  4) Sets the SAME admin_session cookie that update-password + session read.
//  5) Always returns JSON with a real message (page no longer crashes on HTML).

async function bcryptMatches(plain: string, hash: string): Promise<boolean> {
  try {
    if (!hash.startsWith('$2')) return false;
    const mod: any = await import('bcryptjs').catch(() => null);
    if (!mod) return false;
    const compare = mod.compare || mod.default?.compare;
    if (!compare) return false;
    return await compare(plain, hash);
  } catch { return false; }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try { body = await request.json(); } catch { body = {}; }
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const cleanPassword = String(body.password || '');
    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }
    await sql`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
    const rows: any[] = await sql`SELECT id, email, password, name FROM admins WHERE LOWER(TRIM(email)) = ${cleanEmail} LIMIT 1`;
    let admin: any = null;
    if (rows.length) {
      const stored = String(rows[0].password || '');
      const plainOk = stored.length > 0 && stored === cleanPassword.trim();
      const hashOk = !plainOk && (await bcryptMatches(cleanPassword.trim(), stored));
      if (plainOk || hashOk) admin = rows[0];
      if (!admin) {
        return NextResponse.json({ success: false, message: 'Invalid email or password. If you changed your password in Settings, use the NEW password — the old one no longer works.' }, { status: 401 });
      }
    } else {
      // No row at all: first-time setup only. Create the row with admin123 so the
      // next login uses the DB, not the fallback — then change it in Settings.
      if (cleanEmail === 'admin@prayread.com' && cleanPassword.trim() === 'admin123') {
        const created: any[] = await sql`INSERT INTO admins (email, password, name) VALUES (${cleanEmail}, 'admin123', 'Admin') ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password RETURNING id, email, name`;
        admin = created[0];
      } else {
        return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
      }
    }
    const sessionData = { id: admin.id, email: admin.email, name: admin.name || 'Admin', timestamp: Date.now() };
    const response = NextResponse.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name || 'Admin' } });
    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed: ' + (error?.message || 'server error') }, { status: 500 });
  }
}
