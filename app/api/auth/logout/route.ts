import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/logout — FIXED (also handles GET, in case your page calls GET)
// Old code: only cleared `admin_session`.
// Signup / login now set `user_session` + `session` + `auth-token` + `admin_session`.
// So a normal user tapped Logout, this cleared nothing they had, and they stayed logged in.
// Fixed: clears ALL session cookies, with the same path/options they were set with,
// and expires them (maxAge: 0) so the browser actually removes them.
const COOKIES_TO_CLEAR = ['admin_session', 'user_session', 'session', 'auth-token', 'auth_token', 'token'];

function clearAll() {
  const response = NextResponse.json({ success: true, message: 'Logged out.' });
  for (const name of COOKIES_TO_CLEAR) {
    // delete() alone is not always enough across browsers — also set an expired cookie
    try { response.cookies.delete(name); } catch { /* ignore */ }
    response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, expires: new Date(0), path: '/' });
  }
  return response;
}

export async function POST(_request: NextRequest) {
  return clearAll();
}

// Some logout buttons do a GET / link navigation instead of POST — handle it too,
// so logout never 405s and leaves the user stuck logged in.
export async function GET(_request: NextRequest) {
  return clearAll();
}
