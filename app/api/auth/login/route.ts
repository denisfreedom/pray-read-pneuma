import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/auth/login — ADMIN LOGIN
// Mirror image of your WORKING app/api/auth/user-login/route.ts.
// Same imports, same sql = neon(DATABASE_URL!), same structure, same
// cookie style (secure: true, sameSite: 'none' — so it works in iframes /
// previews exactly like user login does).
// Differences, on purpose:
//   users table  -> admins table
//   user_session -> admin_session cookie
//   { user }     -> { admin }  (app/login/page.tsx reads data.admin)
//   Password: plain-text match, because /api/auth/update-password saves
//   plain text. If it does not match, the password in Settings is the one
//   that counts — admin123 does NOT bypass a real row.
//   admin123 works ONLY when there is NO admins row at all (first setup).
//   It then creates that row, so the next login uses the DB.

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // Make sure the admins table exists (same as your other routes do)
    await sql`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, name TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;

    // Find admin by email (password checked below, so we can give the right message)
    const admins = await sql`
      SELECT id, email, password, name, created_at
      FROM admins
      WHERE LOWER(TRIM(email)) = ${cleanEmail}
      LIMIT 1
    `;

    let admin: any = null;

    if (admins.length > 0) {
      const stored = String(admins[0].password || '');
      if (stored.length > 0 && stored === cleanPassword) {
        admin = admins[0];
      } else if (stored.startsWith('$2')) {
        // Old row saved as a bcrypt hash — plain text can never match it.
        // Reset it once in Neon, then log in and set a new password in Settings:
        // UPDATE admins SET password = 'admin123' WHERE email = 'admin@prayread.com';
        return NextResponse.json({
          success: false,
          message: 'This admin password was saved as an encrypted hash and cannot be checked. Reset it in Neon, then log in and set a new password in Settings.'
        }, { status: 401 });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid email or password. If you changed your password in Settings, use the NEW password — the old one no longer works.'
        }, { status: 401 });
      }
    } else {
      // No admins row at all: first-time setup only.
      if (cleanEmail === 'admin@prayread.com' && cleanPassword === 'admin123') {
        const created = await sql`
          INSERT INTO admins (email, password, name)
          VALUES (${cleanEmail}, 'admin123', 'Admin')
          ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
          RETURNING id, email, name, created_at
        `;
        admin = created[0];
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid email or password'
        }, { status: 401 });
      }
    }

    // Create session data — same shape as user login, plus role: 'admin'
    const sessionData = {
      id: admin.id,
      email: admin.email,
      name: admin.name || 'Admin',
      role: 'admin',
      timestamp: Date.now()
    };

    // Create response with admin data — page does setAdmin(data.admin)
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name || 'Admin'
      }
    });

    // Set cookie for session — SAME style as your working user-login route
    response.cookies.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Login failed: ' + ((error as any)?.message || 'server error')
    }, { status: 500 });
  }
}
