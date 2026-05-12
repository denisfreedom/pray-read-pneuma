import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const plans = await sql`
      SELECT 
        id,
        title,
        description,
        thumbnail_url,
        schedule_type,
        schedule_time,
        is_active,
        created_at,
        updated_at,
        devotional_text
      FROM devotional_plans
      WHERE is_active = true
      ORDER BY created_at DESC
    `;
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching devotional plans:', error);
    return NextResponse.json({ error: 'Failed to fetch devotional plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      thumbnail_url,
      schedule_type,
      schedule_time,
      is_active,
      devotional_text
    } = body;

    const result = await sql`
      INSERT INTO devotional_plans (
        title,
        description,
        thumbnail_url,
        schedule_type,
        schedule_time,
        is_active,
        devotional_text,
        created_at,
        updated_at
      ) VALUES (
        ${title},
        ${description || null},
        ${thumbnail_url || null},
        ${schedule_type || 'daily'},
        ${schedule_time || null},
        ${is_active !== undefined ? is_active : true},
        ${devotional_text || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating devotional plan:', error);
    return NextResponse.json({ error: 'Failed to create devotional plan' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      thumbnail_url,
      devotional_text,
      schedule_type,
      schedule_time,
      is_active
    } = body;

    const result = await sql`
      UPDATE devotional_plans
      SET
        title = ${title},
        description = ${description || null},
        thumbnail_url = ${thumbnail_url || null},
        devotional_text = ${devotional_text || null},
        schedule_type = ${schedule_type || 'daily'},
        schedule_time = ${schedule_time || null},
        is_active = ${is_active !== undefined ? is_active : true},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Devotional plan not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating devotional plan:', error);
    return NextResponse.json({ error: 'Failed to update devotional plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM devotional_plans WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devotional plan:', error);
    return NextResponse.json({ error: 'Failed to delete devotional plan' }, { status: 500 });
  }
}
