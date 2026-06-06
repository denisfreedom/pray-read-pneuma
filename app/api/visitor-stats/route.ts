import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get active users (visited in last 5 minutes)
    const activeUsersResult = await sql`
      SELECT COUNT(DISTINCT ip_address) as count
      FROM page_visits
      WHERE visited_at >= NOW() - INTERVAL '5 minutes'
    `;
    const activeUsers = parseInt(String(activeUsersResult[0]?.count || '0'));

    // Get total visitors in last 24 hours
    const last24HoursResult = await sql`
      SELECT COUNT(DISTINCT ip_address) as count
      FROM page_visits
      WHERE visited_at >= NOW() - INTERVAL '24 hours'
    `;
    const last24Hours = parseInt(String(last24HoursResult[0]?.count || '0'));

    // Get recent visitors (last 15 visitors from past hour with location data)
    const recentUsersResult = await sql`
      SELECT 
        country, 
        city, 
        visited_at as timestamp
      FROM page_visits
      WHERE visited_at >= NOW() - INTERVAL '1 hour'
        AND country IS NOT NULL
        AND country != 'Unknown'
        AND city IS NOT NULL
        AND city != 'Unknown'
      ORDER BY visited_at DESC
      LIMIT 15
    `;

    // Format recent users
    const recentUsers = recentUsersResult.map(user => ({
      country: String(user.country),
      city: String(user.city),
      timestamp: user.timestamp,
    }));

    return NextResponse.json({
      activeUsers,
      last24Hours,
      recentUsers,
    });
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    // Return empty stats instead of error to avoid breaking the UI
    return NextResponse.json({
      activeUsers: 0,
      last24Hours: 0,
      recentUsers: [],
    });
  }
}
