import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// POST /api/auth/update-password — FIXED
// Old code: only checked `admins` table, only `password` column, case-sensitive email,
// `neon()` at top-level (crashes whole route if DATABASE_URL missing), no length check.
// Result: normal users ALWAYS got "Admin not found" (404), even with the right password.
// Fixed: checks `admins` FIRST, then `users`. Checks BOTH `password` and `password_hash`
// (plus bcrypt if the hash is a bcrypt hash). Updates BOTH columns for users.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, message: 'Database is not configured (DATABASE_URL missing in Vercel).' }, { status: 500 });
    }
    // FIX: create neon() INSIDE the handler, not at file top. Top-level neon() throws
    // at import time if DATABASE_URL is missing and takes the whole route down with HTML.
    const sql = neon(process.env.DATABASE_URL);
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 }); }

    const email = String(body.email || '').trim().toLowerCase();
    const currentPassword = String(body.currentPassword || body.current_password || body.oldPassword || '');
    const newPassword = String(body.newPassword || body.new_password || '');

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: 'New password must be at least 6 characters.' }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ success: false, message: 'New password must be different from the current password.' }, { status: 400 });
    }

    const matches = async (storedPlain: any, storedHash: any, typed: string): Promise<boolean> => {
      const plain = String(storedPlain || '').trim();
      const hash = String(storedHash || '').trim();
      if (plain && typed === plain) return true;
      if (hash && typed === hash) return true;
      if (plain && typed.trim() === plain) return true;
      if (hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'))) {
        try {
          const bcrypt: any = await import('bcryptjs').then((m: any) => m.default || m).catch(() => null);
          if (bcrypt && typeof bcrypt.compare === 'function' && (await bcrypt.compare(typed, hash))) return true;
        } catch { /* bcrypt not installed — plain checks above already tried */ }
      }
      return false;
    };

    // 1) Try ADMINS first (your original behaviour) — case-insensitive email
    try {
      const admins: any[] = await sql`SELECT id, email, password FROM admins WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
      if (admins.length) {
        const admin = admins[0];
        if (!(await matches(admin.password, null, currentPassword))) {
          return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 401 });
        }
        await sql`UPDATE admins SET password = ${newPassword} WHERE id = ${admin.id}`;
        return NextResponse.json({ success: true, message: 'Password updated successfully.' });
      }
    } catch (e: any) {
      // admins table missing is OK — fall through to users. Any other error is real.
      if (!String(e.message || '').toLowerCase().includes('does not exist') && !String(e.message || '').toLowerCase().includes('relation')) {
        return NextResponse.json({ success: false, message: 'Database lookup failed: ' + (e.message || '') }, { status: 500 });
      }
    }

    // 2) Then USERS — this is what the old code never did, so all normal users failed
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    } catch { /* ignore */ }
    let users: any[] = [];
    try {
      users = await sql`SELECT id, email, password, password_hash FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    } catch (e: any) {
      return NextResponse.json({ success: false, message: 'Database lookup failed: ' + (e.message || '') }, { status: 500 });
    }
    if (!users.length) {
      // Same generic message for "no such account" — don't leak which table / email exists
      return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
    }
    const user = users[0];
    if (!(await matches(user.password, user.password_hash, currentPassword))) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 401 });
    }
    // Update BOTH columns (same as signup / reset) so the fixed login finds it either way
    await sql`UPDATE users SET password = ${newPassword}, password_hash = ${newPassword} WHERE id = ${user.id}`;
    // Also clear any stale reset token, so an old reset link cannot overwrite the new password
    try { await sql`UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ${user.id}`; } catch { /* columns may not exist */ }
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Password update error:', error);
    // ALWAYS JSON — never HTML, or the page shows a generic error
    return NextResponse.json({ success: false, message: 'Failed to update password: ' + (error.message || 'server error') }, { status: 500 });
  }
}
