import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const date = searchParams.get('date');
    const showAll = searchParams.get('showAll') === 'true';
    const userEmail = searchParams.get('userEmail');
    const entryId = searchParams.get('entryId');

    // Handle fetching by entryId (for deep linking)
    if (entryId) {
      if (userEmail) {
        const result = await sql`
          SELECT e.*, 
            CASE WHEN udp.completed IS NOT NULL THEN udp.completed ELSE false END as user_completed,
            udp.completed_at as user_completed_at
          FROM devotional_entries e
          LEFT JOIN user_devotional_progress udp 
            ON e.id = udp.entry_id AND udp.user_email = ${userEmail}
          WHERE e.id = ${entryId}
            AND e.is_published = true
        `;
        return NextResponse.json(result);
      } else {
        const result = await sql`
          SELECT e.*,
            false as user_completed,
            NULL as user_completed_at
          FROM devotional_entries e
          WHERE e.id = ${entryId}
            AND e.is_published = true
        `;
        return NextResponse.json(result);
      }
    }

    if (date && planId) {
      // Get entry for specific date and plan (compare only date part, ignore time)
      if (userEmail) {
        const result = await sql`
          SELECT e.*, 
            CASE WHEN udp.completed IS NOT NULL THEN udp.completed ELSE false END as user_completed,
            udp.completed_at as user_completed_at
          FROM devotional_entries e
          LEFT JOIN user_devotional_progress udp 
            ON e.id = udp.entry_id AND udp.user_email = ${userEmail}
          WHERE e.plan_id = ${planId}
            AND DATE(e.scheduled_date) = ${date}::date
            AND e.is_published = true
          ORDER BY e.scheduled_date ASC
        `;
        return NextResponse.json(result);
      } else {
        const result = await sql`
          SELECT e.*,
            false as user_completed,
            NULL as user_completed_at
          FROM devotional_entries e
          WHERE e.plan_id = ${planId}
            AND DATE(e.scheduled_date) = ${date}::date
            AND e.is_published = true
          ORDER BY e.scheduled_date ASC
        `;
        return NextResponse.json(result);
      }
    } else if (planId) {
      const showAllAdmin = searchParams.get('showAll') === 'true';

      if (showAllAdmin) {
        // Admin: return ALL entries for this plan regardless of date/published
        const result = await sql`
          SELECT e.*,
            false as user_completed,
            NULL as user_completed_at
          FROM devotional_entries e
          WHERE e.plan_id = ${planId}
          ORDER BY e.scheduled_date ASC
        `;
        return NextResponse.json(result);
      }

      // Get all entries for a plan (only past and today, published only)
      // Use CURRENT_DATE (server's date, timezone-safe) instead of JS toISOString
      if (userEmail) {
        const result = await sql`
          SELECT e.*,
            CASE WHEN udp.completed IS NOT NULL THEN udp.completed ELSE false END as user_completed,
            udp.completed_at as user_completed_at
          FROM devotional_entries e
          LEFT JOIN user_devotional_progress udp 
            ON e.id = udp.entry_id AND udp.user_email = ${userEmail}
          WHERE e.plan_id = ${planId}
            AND DATE(e.scheduled_date) <= CURRENT_DATE
            AND e.is_published = true
          ORDER BY e.scheduled_date ASC
        `;
        return NextResponse.json(result);
      } else {
        const result = await sql`
          SELECT e.*,
            false as user_completed,
            NULL as user_completed_at
          FROM devotional_entries e
          WHERE e.plan_id = ${planId}
            AND DATE(e.scheduled_date) <= CURRENT_DATE
            AND e.is_published = true
          ORDER BY e.scheduled_date ASC
        `;
        return NextResponse.json(result);
      }
    } else if (showAll) {
      // Get all published entries (for grid view) — use CURRENT_DATE to avoid UTC timezone shift
      if (userEmail) {
        const result = await sql`
          SELECT e.*,
            CASE WHEN udp.completed IS NOT NULL THEN udp.completed ELSE false END as user_completed,
            udp.completed_at as user_completed_at
          FROM devotional_entries e
          LEFT JOIN user_devotional_progress udp 
            ON e.id = udp.entry_id AND udp.user_email = ${userEmail}
          WHERE e.is_published = true 
            AND DATE(e.scheduled_date) <= CURRENT_DATE
          ORDER BY e.scheduled_date DESC
        `;
        return NextResponse.json(result);
      } else {
        const result = await sql`
          SELECT e.*,
            false as user_completed,
            NULL as user_completed_at
          FROM devotional_entries e
          WHERE e.is_published = true 
            AND DATE(e.scheduled_date) <= CURRENT_DATE
          ORDER BY e.scheduled_date DESC
        `;
        return NextResponse.json(result);
      }
    } else {
      // Get recent entries
      const entries = await sql`
        SELECT * FROM devotional_entries
        WHERE is_published = true
        ORDER BY scheduled_date DESC
        LIMIT 50
      `;
      return NextResponse.json(entries);
    }
  } catch (error) {
    console.error('Error fetching devotional entries:', error);
    return NextResponse.json({ error: 'Failed to fetch devotional entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      scheduled_date,
      title,
      devotional_text,
      devotional_text_lu,
      scripture_book,
      scripture_chapter,
      scripture_verse,
      scripture_quotation,
      related_scriptures,
      further_readings,
      author,
      cover_photo_url,
      is_published = true
    } = body;

    // Get or create default devotional plan
    let defaultPlan = await sql`SELECT id FROM devotional_plans WHERE is_active = true ORDER BY id ASC LIMIT 1`;
    
    if (defaultPlan.length === 0) {
      // Create a default plan if none exists
      defaultPlan = await sql`
        INSERT INTO devotional_plans (
          title, 
          description, 
          is_active, 
          created_at, 
          updated_at
        ) VALUES (
          'Daily Devotionals',
          'Your daily spiritual journey with God',
          true,
          NOW(),
          NOW()
        ) RETURNING id
      `;
    }

    const planId = defaultPlan[0].id;

    const result = await sql`
      INSERT INTO devotional_entries (
        plan_id,
        scheduled_date,
        title,
        devotional_text,
        devotional_text_lu,
        scripture_book,
        scripture_chapter,
        scripture_verse,
        scripture_quotation,
        related_scriptures,
        further_readings,
        author,
        cover_photo_url,
        is_published,
        created_at,
        updated_at
      ) VALUES (
        ${planId},
        ${scheduled_date},
        ${title},
        ${devotional_text || null},
        ${devotional_text_lu || null},
        ${scripture_book || null},
        ${scripture_chapter || null},
        ${scripture_verse || null},
        ${scripture_quotation || null},
        ${related_scriptures ? JSON.stringify(related_scriptures) : null},
        ${further_readings || null},
        ${author || null},
        ${cover_photo_url || null},
        ${is_published},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating devotional entry:', error);
    return NextResponse.json({ error: 'Failed to create devotional entry' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      scheduled_date,
      title,
      devotional_text,
      devotional_text_lu,
      scripture_book,
      scripture_chapter,
      scripture_verse,
      scripture_quotation,
      related_scriptures,
      further_readings,
      author,
      cover_photo_url,
      is_published
    } = body;

    const result = await sql`
      UPDATE devotional_entries
      SET
        scheduled_date = ${scheduled_date},
        title = ${title},
        devotional_text = ${devotional_text || null},
        devotional_text_lu = ${devotional_text_lu || null},
        scripture_book = ${scripture_book || null},
        scripture_chapter = ${scripture_chapter || null},
        scripture_verse = ${scripture_verse || null},
        scripture_quotation = ${scripture_quotation || null},
        related_scriptures = ${related_scriptures ? JSON.stringify(related_scriptures) : null},
        further_readings = ${further_readings || null},
        author = ${author || null},
        cover_photo_url = ${cover_photo_url || null},
        is_published = ${is_published},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Devotional entry not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating devotional entry:', error);
    return NextResponse.json({ error: 'Failed to update devotional entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM devotional_entries WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devotional entry:', error);
    return NextResponse.json({ error: 'Failed to delete devotional entry' }, { status: 500 });
  }
}
