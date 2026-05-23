import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planId = parseInt(id);

    if (isNaN(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const planRows = await sql`
      SELECT * FROM reading_plans WHERE id = ${planId}
    `;

    if (!planRows.length) {
      return NextResponse.json({ error: 'Reading plan not found' }, { status: 404 });
    }

    const plan = planRows[0];

    // Join with bible_books to get the book_number needed for navigation
    const days = await sql`
      SELECT rpd.*, bb.book_number, bb.name_english as book_name_en, bb.total_chapters
      FROM reading_plan_days rpd
      LEFT JOIN bible_books bb ON bb.name_english = rpd.book
      WHERE rpd.plan_id = ${planId}
      ORDER BY rpd.day_number ASC
    `;

    return NextResponse.json({ plan, days });
  } catch (error) {
    console.error('Error fetching reading plan:', error);
    return NextResponse.json({ error: 'Failed to fetch reading plan' }, { status: 500 });
  }
}
