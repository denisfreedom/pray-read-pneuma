import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Name, email and password are required' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email already registered' 
      }, { status: 400 });
    }

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
    
    // Create new user with location tracking
    const newUsers = await sql`
      INSERT INTO users (name, email, password, ip_address, country, city, is_active, last_active)
      VALUES (${name}, ${email}, ${password}, ${ipAddress}, ${country}, ${city}, false, NOW())
      RETURNING id, name, email, created_at
    `;

    const user = newUsers[0];

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
    console.error('Signup error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Signup failed' 
    }, { status: 500 });
  }
}
