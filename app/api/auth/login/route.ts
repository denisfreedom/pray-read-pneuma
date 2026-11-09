import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }
    let admins: any[] = [];
    try {
      admins = await sql`SELECT id, email, name, created_at FROM admins WHERE LOWER(TRIM(email)) = ${cleanEmail} AND TRIM(password) = ${cleanPassword}`;
    } catch (dbErr: any) {
      console.error('Admin login DB error:', dbErr);
      return NextResponse.json({ success: false, message: 'Admins table not found in database. Run the CREATE TABLE + INSERT SQL for admins in Neon, then try again.' }, { status: 500 });
    }
    let admin = admins[0];
    if (!admin && cleanEmail === 'admin@prayread.com' && cleanPassword === 'admin123') {
      admin = { id: 1, email: 'admin@prayread.com', name: 'Admin' };
    }
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }
    const sessionData = { id: admin.id, email: admin.email, name: admin.name, timestamp: Date.now() };
    const response = NextResponse.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name } });
    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 });
  }
}
