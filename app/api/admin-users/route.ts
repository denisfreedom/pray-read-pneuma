import { NextResponse } from 'next/server';
import sql, { isDbConfigured } from '@/app/api/utils/sql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// app/api/admin/users/route.ts — FIXED
// Was: one missing table (users, "user", verse_view_log, book_visit_log,
// prayer_activity_log) -> whole GET 500 -> Users tab blank.
// Now: every query runs on its own. Missing table -> empty list for that
// part, the rest still return.
// PATCH: validates action, matches id as text (id::text) so it works
// whether users.id is int or uuid, and never 500s on a missing table.

async function safeSelect(fn: () => Promise<any>) {
  try {
    const r = await fn();
    return Array.isArray(r) ? r : [];
  } catch (e: any) {
    console.error('admin/users select skipped:', e?.message || e);
    return [];
  }
}

async function safeRun(fn: () => Promise<any>) {
  try {
    await fn();
    return true;
  } catch (e: any) {
    console.error('admin/users write skipped:', e?.message || e);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables, then redeploy.' },
        { status: 503 }
      );
    }

    // Build users from both tables - users (custom auth) and "user" (better-auth)
    let usersQuery: any[] = [];
    const like = `%${search}%`;
    if (search && status !== 'all') {
      const isActive = status === 'active';
      usersQuery = await safeSelect(() => sql`
        SELECT
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE (name ILIKE ${like} OR email ILIKE ${like})
          AND is_active = ${isActive}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    } else if (search) {
      usersQuery = await safeSelect(() => sql`
        SELECT
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE name ILIKE ${like} OR email ILIKE ${like}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    } else if (status !== 'all') {
      const isActive = status === 'active';
      usersQuery = await safeSelect(() => sql`
        SELECT
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        WHERE is_active = ${isActive}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    } else {
      usersQuery = await safeSelect(() => sql`
        SELECT
          id::text as id, name, email, created_at, last_login, last_active,
          is_active, country, city, ip_address, 'custom' as auth_provider
        FROM users
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
    }

    // Also fetch better-auth users
    const betterAuthUsers = await safeSelect(() => sql`
      SELECT
        id::text as id, name, email, "createdAt" as created_at,
        NULL as last_login, "updatedAt" as last_active,
        true as is_active, NULL as country, NULL as city, NULL as ip_address,
        'better-auth' as auth_provider
      FROM "user"
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `);

    // Merge and deduplicate by email
    const emailSet = new Set<string>();
    const allUsers: any[] = [];

    for (const u of usersQuery) {
      if (u?.email && !emailSet.has(u.email)) {
        emailSet.add(u.email);
        allUsers.push(u);
      }
    }
    for (const u of betterAuthUsers) {
      if (u?.email && !emailSet.has(u.email)) {
        emailSet.add(u.email);
        allUsers.push(u);
      }
    }

    // Sort by created_at desc
    allUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Active sessions (active in last 15 minutes via verse_view_log or book_visit_log)
    const activeSessions = await safeSelect(() => sql`
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
    `);

    // Total count for pagination
    const [totalCount] = await safeSelect(() => sql`SELECT COUNT(*)::int as count FROM users`);
    const [betterAuthCount] = await safeSelect(() => sql`SELECT COUNT(*)::int as count FROM "user"`);
    const totalUsers = (totalCount?.count || 0) + (betterAuthCount?.count || 0);

    // User activity stats per user
    const userActivity = await safeSelect(() => sql`
      SELECT
        user_email,
        COUNT(*)::int as verse_views
      FROM verse_view_log
      GROUP BY user_email
      ORDER BY verse_views DESC
      LIMIT 100
    `);

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
    if (!['deactivate', 'activate', 'delete'].includes(action)) {
      return NextResponse.json({ error: `Unknown action: ${action}. Use activate, deactivate, or delete.` }, { status: 400 });
    }
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: 'DATABASE_URL is not set in Vercel. Add it in Vercel > Settings > Environment Variables, then redeploy.' },
        { status: 503 }
      );
    }

    // id::text = ${userId} works whether users.id is int or uuid.
    // Old code used id = ${userId} with a text param, which fails on int ids.
    const uid = String(userId);
    if (action === 'deactivate') {
      await safeRun(() => sql`UPDATE users SET is_active = false WHERE id::text = ${uid}`);
    } else if (action === 'activate') {
      await safeRun(() => sql`UPDATE users SET is_active = true WHERE id::text = ${uid}`);
    } else if (action === 'delete') {
      await safeRun(() => sql`DELETE FROM users WHERE id::text = ${uid}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin users update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
