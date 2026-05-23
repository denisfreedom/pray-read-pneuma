import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if admin exists
    const admins = await sql`
      SELECT id, email, name FROM admins 
      WHERE email = ${email}
    `;

    if (admins.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    }

    const admin = admins[0];

    // Generate a secure reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await sql`
      INSERT INTO password_reset_tokens (admin_id, token, expires_at)
      VALUES (${admin.id}, ${resetToken}, ${expiresAt})
      ON CONFLICT (admin_id) 
      DO UPDATE SET token = ${resetToken}, expires_at = ${expiresAt}, created_at = NOW()
    `;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ikplaovco14ju2kcztkwh.web-preview.appgen.com';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email via Resend
    await resend.emails.send({
      from: 'Pray-Read Bible <onboarding@resend.dev>',
      to: email,
      subject: 'Reset Your Admin Password — Pray-Read Bible',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1c1917; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pray-Read Bible</h1>
            <p style="color: #a8a29e; margin: 8px 0 0;">Admin Portal</p>
          </div>
          <div style="padding: 40px 32px; background: #f9f9f9;">
            <h2 style="color: #1c1917; margin: 0 0 16px;">Reset Your Password</h2>
            <p style="color: #57534e; line-height: 1.6; margin: 0 0 24px;">
              Hi ${admin.name || 'Admin'},<br/><br/>
              We received a request to reset your admin password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="background: #1c1917; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #78716c; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${resetLink}" style="color: #1c1917; word-break: break-all;">${resetLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0;" />
            <p style="color: #a8a29e; font-size: 13px; margin: 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </div>
          <div style="background: #1c1917; padding: 20px 32px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #78716c; font-size: 12px; margin: 0;">© 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions have been sent to your email.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
