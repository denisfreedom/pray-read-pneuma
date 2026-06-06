import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function POST(request: NextRequest) {
  try {
    const { userEmail, contentType } = await request.json();

    if (!userEmail || !contentType) {
      return NextResponse.json({ error: 'Missing userEmail or contentType' }, { status: 400 });
    }

    // Update or insert download record
    await sql`
      INSERT INTO user_content_downloads (user_email, content_type, last_downloaded_at, download_count)
      VALUES (${userEmail}, ${contentType}, NOW(), 1)
      ON CONFLICT (user_email, content_type) 
      DO UPDATE SET 
        last_downloaded_at = NOW(),
        download_count = user_content_downloads.download_count + 1
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark downloaded error:', error);
    return NextResponse.json({ error: 'Failed to mark as downloaded' }, { status: 500 });
  }
}
