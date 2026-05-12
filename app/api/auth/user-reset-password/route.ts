import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Find user
    const users = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid reset link' }, { status: 404 });
    }

    const userId = users[0].id;

    // Verify reset token
    const tokens = await sql`
      SELECT * FROM user_password_reset_tokens 
      WHERE user_id = ${userId} AND reset_code = ${token} AND expires_at > NOW()
    `;

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Update password (in production, hash the password!)
    await sql`
      UPDATE users SET password = ${newPassword} WHERE id = ${userId}
    `;

    // Delete used reset token
    await sql`
      DELETE FROM user_password_reset_tokens WHERE user_id = ${userId}
    `;

    return NextResponse.json({ message: 'Password reset successful! Redirecting to login...' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
