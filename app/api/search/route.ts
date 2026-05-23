import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const language = searchParams.get('language') || 'english';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // Search in bible_verses table
    const result = await pool.query(
      `SELECT 
        v.id, v.book_id, v.chapter, v.verse, v.text,
        b.name as book_name, b.abbreviation, b.testament
      FROM bible_verses v
      JOIN bible_books b ON v.book_id = b.id
      WHERE v.text ILIKE $1 AND b.language = $2
      ORDER BY v.book_id, v.chapter, v.verse
      LIMIT $3`,
      [`%${query}%`, language, limit]
    );

    return NextResponse.json({
      results: result.rows,
      count: result.rows.length,
      query: query
    });
  } catch (error) {
    console.error('Error searching bible:', error);
    return NextResponse.json({ error: 'Failed to search bible' }, { status: 500 });
  }
}
