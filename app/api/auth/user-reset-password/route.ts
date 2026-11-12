import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// POST /api/auth/user-reset-password — FIXED
// Body: { email, token, newPassword }  (page also sends `password` in some versions — accept both)
// Validates token + expiry, updates BOTH password and password_hash (so the fixed login finds it),
// then clears the token so the link cannot be reused.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ success: false, message: 'Database is not configured (DATABASE_URL missing).', error: 'Database is not configured.' }, { status: 500 });
    const sql = neon(process.env.DATABASE_URL);
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Invalid JSON body.', error: 'Invalid JSON body.' }, { status: 400 }); }
    const email = String(body.email || '').trim().toLowerCase();
    const token = String(body.token || '').trim();
    const newPassword = String(body.newPassword || body.password || '');
    if (!email || !token) return NextResponse.json({ success: false, message: 'Invalid reset link. Please request a new one.', error: 'Invalid reset link. Please request a new one.' }, { status: 400 });
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ success: false, message: 'Password must be at least 6 characters.', error: 'Password must be at least 6 characters.' }, { status: 400 });
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    } catch (e: any) { return NextResponse.json({ success: false, message: 'Could not read users table: ' + (e.message || ''), error: 'Could not read users table.' }, { status: 500 }); }
    let rows: any[] = [];
    try { rows = await sql`SELECT id, reset_token, reset_token_expires FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`; }
    catch (e: any) { return NextResponse.json({ success: false, message: 'Database lookup failed: ' + (e.message || ''), error: 'Database lookup failed.' }, { status: 500 }); }
    if (!rows.length) return NextResponse.json({ success: false, message: 'Invalid reset link. Please request a new one.', error: 'Invalid reset link. Please request a new one.' }, { status: 400 });
    const user = rows[0];
    if (!user.reset_token || user.reset_token !== token) {
      return NextResponse.json({ success: false, message: 'This reset link is invalid or has already been used. Please request a new one.', error: 'This reset link is invalid or has already been used. Please request a new one.' }, { status: 400 });
    }
    if (user.reset_token_expires && new Date(user.reset_token_expires).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: 'This reset link has expired. Please request a new one.', error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
    }
    // Update BOTH columns (same as signup) + clear token so link cannot be reused
    await sql`UPDATE users SET password = ${newPassword}, password_hash = ${newPassword}, reset_token = NULL, reset_token_expires = NULL WHERE id = ${user.id}`;
    return NextResponse.json({ success: true, message: 'Password reset successful! Redirecting to login...' });
  } catch (e: any) {
    console.error('Reset error:', e);
    return NextResponse.json({ success: false, message: 'Reset failed: ' + (e.message || 'server error'), error: 'Reset failed.' }, { status: 500 });
  }
}
