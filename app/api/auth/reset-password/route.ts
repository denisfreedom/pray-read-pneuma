import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/auth/update-password — ADMIN PANEL SETTINGS
// Mirror of your WORKING /api/auth/login route: same imports, same
// sql = neon(DATABASE_URL!), no @/app/api/utils/sql import.
// The Admin Panel Settings tab sends ONLY { newPassword }.
// It does NOT send email or currentPassword — identity comes from the
// admin_session cookie that login sets. The old route required
// email + currentPassword, so it always returned 400 and the button
// looked dead. This route:
//   1) reads email from the admin_session cookie (falls back to body.email),
//   2) accepts newPassword / new_password / password,
//   3) UPDATEs the admins row — or INSERTs one if the admin has no row yet
//      (otherwise the new password would be lost and admin123 would keep working),
//   4) saves plain text, because login checks plain text.

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try { body = await request.json(); } catch { body = {}; }
    const newPassword = String(body.newPassword || body.new_password || body.password || '').trim();
    if (!newPassword) return NextResponse.json({ success: false, message: 'Please enter a new password.' }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ success: false, message: 'New password must be at least 6 characters.' }, { status: 400 });

    // Admin identity comes from the login cookie, NOT from the form.
    let email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      try {
        const cookie = request.headers.get('cookie') || '';
        const m = cookie.match(/admin_session=([^;]+)/);
        if (m) {
          const session = JSON.parse(decodeURIComponent(m[1]));
          email = String(session?.email || '').trim().toLowerCase();
        }
      } catch {}
    }
    if (!email) {
      return NextResponse.json({ success: false, message: 'You are not logged in as admin. Log out, log back in, then try again.' }, { status: 401 });
    }

    await sql`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;

    const existing: any[] = await sql`SELECT id FROM admins WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    if (existing.length) {
      await sql`UPDATE admins SET password = ${newPassword} WHERE id = ${existing[0].id}`;
    } else {
      await sql`INSERT INTO admins (email, password, name) VALUES (${email}, ${newPassword}, 'Admin') ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`;
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully. Use the new password next time you log in.' });
  } catch (error: any) {
    console.error('Admin update-password error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update password: ' + (error?.message || 'server error') }, { status: 500 });
  }
}
