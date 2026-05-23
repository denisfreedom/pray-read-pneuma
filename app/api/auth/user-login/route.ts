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

    // Find user by email and password
    const users = await sql`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE email = ${email} AND password = ${password}
    `;

    if (users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 });
    }

    const user = users[0];

    // Get user location from IP
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    let country = null;
    let city = null;

    // Fetch geolocation data from IP
    if (ipAddress && ipAddress !== 'unknown') {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ipAddress}`);
        const geoData = await geoResponse.json();
        
        if (geoData.status === 'success') {
          country = geoData.country || null;
          city = geoData.city || null;
        }
      } catch (geoError) {
        console.error('Geolocation fetch error:', geoError);
        // Continue without location data
      }
    }

    // Update last login and set active status with location
    await sql`
      UPDATE users 
      SET last_login = NOW(), 
          last_active = NOW(), 
          is_active = true,
          ip_address = ${ipAddress},
          country = ${country},
          city = ${city}
      WHERE id = ${user.id}
    `;

    // Create session data
    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'user',
      timestamp: Date.now()
    };

    // Create response with user data
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    // Set cookie for session — SameSite=None;Secure so it works inside iframes/previews
    response.cookies.set('user_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('User login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Login failed' 
    }, { status: 500 });
  }
}
