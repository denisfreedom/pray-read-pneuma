import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// POST /api/auth/user-forgot-password — FIXED, companion to reset
// Body: { email }
// Creates a token, stores it in users.reset_token + reset_token_expires (1 hour),
// returns { success:true }.
// NOTE: This app has no email-sending service configured, so for now the API
// returns resetUrl in the response (and the forgot page shows it as a clickable
// link). When you later add an email service, send this same link by email
// and remove resetUrl from the response.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ success: false, message: 'Database is not configured (DATABASE_URL missing).' }, { status: 500 });
    const sql = neon(process.env.DATABASE_URL);
    let body: any = {};
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 }); }
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    try {
      await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL, password TEXT, password_hash TEXT, role TEXT DEFAULT 'user', created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`;
    } catch (e: any) { return NextResponse.json({ success: false, message: 'Could not read users table: ' + (e.message || '') }, { status: 500 }); }
    const rows: any[] = await sql`SELECT id FROM users WHERE LOWER(TRIM(email)) = ${email} LIMIT 1`;
    // Always return success, even if email does not exist — don't leak who has an account
    if (!rows.length) return NextResponse.json({ success: true, message: 'If an account exists for this email, a reset link has been created.' });
    const token = crypto.randomBytes(32).toString('hex');
    await sql`UPDATE users SET reset_token = ${token}, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = ${rows[0].id}`;
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://prayreadbible.org';
    const resetUrl = `${base}/user-reset-password?email=${encodeURIComponent(email)}&token=${token}`;
    return NextResponse.json({ success: true, message: 'If an account exists for this email, a reset link has been created.', resetUrl });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: 'Forgot-password failed: ' + (e.message || 'server error') }, { status: 500 });
  }
}
