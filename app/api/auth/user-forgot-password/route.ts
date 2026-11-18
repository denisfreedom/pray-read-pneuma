import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// app/api/auth/session/route.ts — FIXED
// Was: JSON.parse(cookie) and returned the whole cookie object as `user` /
// `admin`. Two problems:
//  1) A forged cookie {"email":"anything"} was trusted as an admin session.
//     This file alone cannot prove a session is real — that proof lives
//     in the login route that SET the cookie. What this file CAN do is
//     refuse malformed / empty / wrong-shaped cookies, and never echo
//     sensitive fields back to the browser.
//  2) It echoed the entire cookie. If login ever stored a password hash
//     or token in that cookie, this endpoint leaked it to any JS on the page.
// Now: parses each cookie on its own (one bad cookie no longer kills the
// other), requires a non-empty string email, returns ONLY safe fields
// (id, name, email, role), and clears a malformed cookie.
// Cookie names + response shape UNCHANGED: { success, isAdmin, isUser, user, admin }.
// NOTE: for real forgery-proof sessions, the login route must sign the
// cookie (HMAC) and this route must verify the signature. That is the
// next step after user signup/login — do not treat this file alone as
// proof that a session cannot be forged.

type SafeUser = { id?: string | number; name?: string; email: string; role?: string };

function safePick(raw: unknown): SafeUser | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const email = typeof o.email === 'string' ? o.email.trim() : '';
  if (!email || !email.includes('@')) return null;
  const out: SafeUser = { email };
  if (typeof o.id === 'string' || typeof o.id === 'number') out.id = o.id;
  if (typeof o.name === 'string' && o.name.trim()) out.name = o.name.trim();
  if (typeof o.role === 'string' && o.role.trim()) out.role = o.role.trim();
  return out;
}

function parseCookie(value: string | undefined): SafeUser | 'invalid' | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    return safePick(JSON.parse(decoded));
  } catch {
    try {
      return safePick(JSON.parse(value));
    } catch {
      return 'invalid';
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for admin session
    const adminRaw = request.cookies.get('admin_session')?.value;
    const adminParsed = parseCookie(adminRaw);
    if (adminParsed === 'invalid') {
      const res = NextResponse.json({ success: false, isAdmin: false, isUser: false });
      res.cookies.delete('admin_session');
      return res;
    }
    if (adminParsed) {
      const admin: SafeUser = { ...adminParsed, role: 'admin' };
      const res = NextResponse.json({
        success: true,
        isAdmin: true,
        isUser: true, // Allow admins to access user dashboard
        user: admin,  // Return admin as user for dashboard access
        admin
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Check for user session
    const userRaw = request.cookies.get('user_session')?.value;
    const userParsed = parseCookie(userRaw);
    if (userParsed === 'invalid') {
      const res = NextResponse.json({ success: false, isAdmin: false, isUser: false });
      res.cookies.delete('user_session');
      return res;
    }
    if (userParsed) {
      const res = NextResponse.json({
        success: true,
        isAdmin: false,
        isUser: true,
        user: userParsed
      });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // No session found
    const res = NextResponse.json({
      success: false,
      isAdmin: false,
      isUser: false
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({
      success: false,
      isAdmin: false,
      isUser: false
    });
  }
}
