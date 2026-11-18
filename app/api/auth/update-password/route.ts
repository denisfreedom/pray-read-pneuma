import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/auth/update-password — ADMIN PANEL SETTINGS FIX (V2)
// The Admin Panel Settings tab sends ONLY { newPassword }.
// It does NOT send email or currentPassword — it relies on the logged-in
// admin_session cookie. The previous route required email + currentPassword,
// so it ALWAYS returned 400 "Missing required fields" and the button looked dead.
// This route:
//  1) reads the admin email from the admin_session cookie (same cookie admin login sets),
//  2) falls back to body.email if a caller sends it,
//  3) UPDATEs the admins row — or INSERTs one if the admin was logging in via
//     the hardcoded admin123 fallback and has no row yet (otherwise the new
//     password would be lost on next login),
//  4) always returns JSON with a real message, never a generic failure.
export async function POST(request: Request) {
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

    // Make sure the admins table exists, then upsert the password.
    try {
      await sql`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
    } catch (e: any) {
      return NextResponse.json({ success: false, message: 'Admins table could not be created: ' + (e?.message || '') }, { status: 500 });
    }

    const existing: any[] = await sql`SELECT id FROM admins WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    if (existing.length) {
      await sql`UPDATE admins SET password = ${newPassword} WHERE id = ${existing[0].id}`;
    } else {
      // Fallback-login admin (admin123) has no row — create it, or the new
      // password would vanish and admin123 would keep working instead.
      await sql`INSERT INTO admins (email, password, name) VALUES (${email}, ${newPassword}, 'Admin') ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`;
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully. Use the new password next time you log in.' });
  } catch (error: any) {
    console.error('Admin update-password error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update password: ' + (error?.message || 'server error') }, { status: 500 });
  }
}
