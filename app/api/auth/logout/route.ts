import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear the admin session cookie
  response.cookies.delete('admin_session');
  
  return response;
}
