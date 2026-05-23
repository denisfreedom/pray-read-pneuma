import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Save to database
    await sql`
      INSERT INTO contact_messages (name, email, subject, message, status, created_at)
      VALUES (${name}, ${email}, ${subject || ''}, ${message}, 'unread', NOW())
    `;

    return NextResponse.json({ 
      success: true,
      message: 'Your message has been sent successfully!' 
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
