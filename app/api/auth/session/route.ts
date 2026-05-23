import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for admin session
    const adminSessionCookie = request.cookies.get('admin_session');
    if (adminSessionCookie) {
      const admin = JSON.parse(adminSessionCookie.value);
      return NextResponse.json({ 
        success: true, 
        isAdmin: true,
        isUser: true, // Allow admins to access user dashboard
        user: admin,  // Return admin as user for dashboard access
        admin 
      });
    }

    // Check for user session
    const userSessionCookie = request.cookies.get('user_session');
    if (userSessionCookie) {
      const user = JSON.parse(userSessionCookie.value);
      return NextResponse.json({ 
        success: true, 
        isAdmin: false,
        isUser: true,
        user 
      });
    }

    // No session found
    return NextResponse.json({ 
      success: false, 
      isAdmin: false,
      isUser: false 
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      success: false, 
      isAdmin: false,
      isUser: false 
    });
  }
}
