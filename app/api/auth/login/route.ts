import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email and password are required' 
      }, { status: 400 });
    }

    // Find admin by email and password
    const admins = await sql`
      SELECT id, email, name, created_at 
      FROM admins 
      WHERE email = ${email} AND password = ${password}
    `;

    if (admins.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 });
    }

    const admin = admins[0];

    // Create session data
    const sessionData = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      timestamp: Date.now()
    };

    // Create response with admin data
    const response = NextResponse.json({ 
      success: true, 
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });

    // Set cookie for session with proper settings
    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Login failed' 
    }, { status: 500 });
  }
}
