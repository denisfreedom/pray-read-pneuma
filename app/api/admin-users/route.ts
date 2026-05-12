import { NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build users from both tables - users (custom auth) and "user" (better-auth)
    let usersQuery;
    if (search && status !== 'all') {
      const isActive = status === 'active';
      usersQuery = await sql`
        SELECT 
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE (name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})
          AND is_active = ${isActive}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (search) {
      usersQuery = await sql`
        SELECT 
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status !== 'all') {
      const isActive = status === 'active';
      usersQuery = await sql`
        SELECT 
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE is_active = ${isActive}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      usersQuery = await sql`
        SELECT 
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Also fetch better-auth users
    const betterAuthUsers = await sql`
      SELECT 
        id::text as id, name, email, "createdAt" as created_at, 
        NULL as last_login, "updatedAt" as last_active,
        true as is_active, NULL as country, NULL as city, NULL as ip_address,
        'better-auth' as auth_provider
      FROM "user"
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    // Merge and deduplicate by email
    const emailSet = new Set<string>();
    const allUsers: any[] = [];
    
    for (const u of usersQuery) {
      if (!emailSet.has(u.email)) {
        emailSet.add(u.email);
        allUsers.push(u);
      }
    }
    for (const u of betterAuthUsers) {
      if (!emailSet.has(u.email)) {
        emailSet.add(u.email);
        allUsers.push(u);
      }
    }

    // Sort by created_at desc
    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Active sessions (active in last 15 minutes via verse_view_log or book_visit_log)
    const activeSessions = await sql`
      SELECT DISTINCT user_email, MAX(created_at) as last_seen
      FROM (
        SELECT user_email, created_at FROM verse_view_log WHERE created_at > NOW() - INTERVAL '15 minutes'
        UNION ALL
        SELECT user_email, visited_at as created_at FROM book_visit_log WHERE visited_at > NOW() - INTERVAL '15 minutes'
        UNION ALL
        SELECT user_email, created_at FROM prayer_activity_log WHERE created_at > NOW() - INTERVAL '15 minutes'
      ) combined
      GROUP BY user_email
      ORDER BY last_seen DESC
    `;

    // Total count for pagination
    const [totalCount] = await sql`SELECT COUNT(*)::int as count FROM users`;
    const [betterAuthCount] = await sql`SELECT COUNT(*)::int as count FROM "user"`;
    const totalUsers = (totalCount?.count || 0) + (betterAuthCount?.count || 0);

    // User activity stats per user
    const userActivity = await sql`
      SELECT 
        user_email,
        COUNT(*)::int as verse_views
      FROM verse_view_log
      GROUP BY user_email
      ORDER BY verse_views DESC
      LIMIT 100
    `;

    return NextResponse.json({
      users: allUsers,
      activeSessions,
      totalUsers,
      currentPage: page,
      userActivity,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, action } = await request.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    if (action === 'deactivate') {
      await sql`UPDATE users SET is_active = false WHERE id = ${userId}`;
    } else if (action === 'activate') {
      await sql`UPDATE users SET is_active = true WHERE id = ${userId}`;
    } else if (action === 'delete') {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin users update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
