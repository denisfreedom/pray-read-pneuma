import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(request: NextRequest) {
  try {
    // Fetch plans with day count and first book info
    const plans = await sql`
      SELECT 
        rp.*,
        COUNT(rpd.id) as day_count,
        MIN(rpd.day_number) as first_day,
        (
          SELECT rpd2.book FROM reading_plan_days rpd2
          WHERE rpd2.plan_id = rp.id
          ORDER BY rpd2.day_number ASC LIMIT 1
        ) as first_book
      FROM reading_plans rp
      LEFT JOIN reading_plan_days rpd ON rpd.plan_id = rp.id
      GROUP BY rp.id
      ORDER BY rp.duration_days ASC
    `;

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching reading plans:', error);
    return NextResponse.json({ error: 'Failed to fetch reading plans' }, { status: 500 });
  }
}
