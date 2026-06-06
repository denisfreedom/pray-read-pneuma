import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin panel — only accessible with admin_session cookie
  if (pathname.startsWith('/admin-panel') || pathname.startsWith('/cpanel')) {
    const adminSession = request.cookies.get('admin_session');
    if (!adminSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Routes that require user authentication
  const protectedRoutes = [
    '/dashboard',
    '/reading-plans',
    '/verse-collections',
    '/reminders',
    '/qa',
    '/devotional-plans',
    '/theological-insights',
    '/historical-context',
    '/discussion-groups',
    '/verse-songs',
    '/community',
  ];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtectedRoute) {
    const adminSession = request.cookies.get('admin_session');
    const userSession = request.cookies.get('user_session');
    
    if (!adminSession && !userSession) {
      const loginUrl = new URL('/user-login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('message', 'Please sign in to access this feature');
      return NextResponse.redirect(loginUrl);
    }
  }

  // No redirect needed here — the login/signup pages handle their own post-login redirect
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin-panel/:path*',
    '/admin-panel',
    '/cpanel/:path*',
    '/cpanel',
    '/dashboard/:path*',
    '/reading-plans/:path*',
    '/verse-collections/:path*',
    '/reminders/:path*',
    '/qa/:path*',
    '/qa',
    '/devotional-plans/:path*',
    '/devotional-plans',
    '/theological-insights/:path*',
    '/theological-insights',
    '/historical-context/:path*',
    '/historical-context',
    '/discussion-groups/:path*',
    '/discussion-groups',
    '/verse-songs/:path*',
    '/verse-songs',
    '/community/:path*',
    '/community',
  ]
};
