import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || '1'; // Default user for demo
    
    const reminders = await sql`
      SELECT * FROM reminders 
      WHERE user_id = ${userId}
      ORDER BY time ASC
    `;
    
    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || '1';
    const { time, days, enabled } = await request.json();
    
    const result = await sql`
      INSERT INTO reminders (user_id, time, days, enabled)
      VALUES (${userId}, ${time}, ${JSON.stringify(days)}, ${enabled ?? true})
      RETURNING *
    `;
    
    return NextResponse.json({ reminder: result[0] });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, time, days, enabled } = await request.json();
    
    const result = await sql`
      UPDATE reminders 
      SET time = ${time}, days = ${JSON.stringify(days)}, enabled = ${enabled}
      WHERE id = ${id}
      RETURNING *
    `;
    
    return NextResponse.json({ reminder: result[0] });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    await sql`DELETE FROM reminders WHERE id = ${id}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
