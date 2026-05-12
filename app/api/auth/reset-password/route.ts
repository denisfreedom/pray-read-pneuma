import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Find admin by email
    const admins = await sql`
      SELECT id FROM admins 
      WHERE email = ${email}
    `;

    if (admins.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid reset link' },
        { status: 400 }
      );
    }

    const admin = admins[0];

    // Verify reset token
    const tokens = await sql`
      SELECT * FROM password_reset_tokens 
      WHERE admin_id = ${admin.id} 
      AND token = ${token}
      AND expires_at > NOW()
    `;

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, message: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update password
    await sql`
      UPDATE admins 
      SET password = ${newPassword}
      WHERE id = ${admin.id}
    `;

    // Delete used token
    await sql`
      DELETE FROM password_reset_tokens 
      WHERE admin_id = ${admin.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
