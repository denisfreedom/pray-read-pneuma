import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const users = await sql`
      SELECT id, name FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      // Don't reveal if email exists
      return NextResponse.json({
        message: 'If an account with that email exists, a reset link has been sent.'
      });
    }

    const user = users[0];
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await sql`
      INSERT INTO user_password_reset_tokens (user_id, reset_code, expires_at)
      VALUES (${user.id}, ${resetToken}, ${expiresAt})
      ON CONFLICT (user_id) 
      DO UPDATE SET reset_code = ${resetToken}, expires_at = ${expiresAt}, created_at = NOW()
    `;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ikplaovco14ju2kcztkwh.web-preview.appgen.com';
    const resetLink = `${appUrl}/user-reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send password reset email via Resend
    await resend.emails.send({
      from: 'Pray-Read Bible <onboarding@resend.dev>',
      to: email,
      subject: 'Reset Your Password — Pray-Read Bible',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pray-Read Bible</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0;">Your Daily Scripture Companion</p>
          </div>
          <div style="padding: 40px 32px; background: #f9f9f9;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Reset Your Password</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
              Hi ${user.name || 'there'},<br/><br/>
              We received a request to reset your password. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #1e40af, #7c3aed); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${resetLink}" style="color: #1e40af; word-break: break-all;">${resetLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
          </div>
          <div style="background: #1e293b; padding: 20px 32px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 Pneuma Freedom Experience Ministry. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      message: 'A password reset link has been sent to your email address.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
