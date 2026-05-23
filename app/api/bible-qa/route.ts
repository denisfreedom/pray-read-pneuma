import sql from "@/app/api/utils/sql";
import { NextRequest, NextResponse } from "next/server";

function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100)
    + '-' + Date.now();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const topic = searchParams.get('topic');
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  // Return topics list
  if (type === 'topics') {
    const rows = await sql`SELECT * FROM qa_topics ORDER BY name_en ASC`;
    return NextResponse.json(rows);
  }

  if (slug) {
    const rows = await sql`SELECT * FROM bible_qa WHERE slug = ${slug}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  if (id) {
    const rows = await sql`SELECT * FROM bible_qa WHERE id = ${parseInt(id)}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  if (topic) {
    const rows = await sql`SELECT * FROM bible_qa WHERE topic = ${topic} AND is_published = true ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  }

  const rows = await sql`SELECT * FROM bible_qa ORDER BY topic ASC, created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, name_en, name_lu } = body;

  // Create a new topic
  if (type === 'topic') {
    if (!name_en) return NextResponse.json({ error: 'name_en required' }, { status: 400 });
    const rows = await sql`
      INSERT INTO qa_topics (name_en, name_lu)
      VALUES (${name_en}, ${name_lu || null})
      ON CONFLICT (name_en) DO UPDATE SET name_lu = EXCLUDED.name_lu
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  }

  const { topic, question, question_lu, answer, answer_lu, scripture_refs, is_published } = body;

  if (!topic || !question || !answer) {
    return NextResponse.json({ error: 'topic, question, and answer are required' }, { status: 400 });
  }

  const slug = generateSlug(question);
  const refs = scripture_refs || [];
  const published = is_published !== undefined ? is_published : true;

  const rows = await sql`
    INSERT INTO bible_qa (topic, question, question_lu, answer, answer_lu, scripture_refs, slug, is_published)
    VALUES (${topic}, ${question}, ${question_lu || null}, ${answer}, ${answer_lu || null}, ${JSON.stringify(refs)}, ${slug}, ${published})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { type, id: topicId, name_en, name_lu } = body;

  // Update topic
  if (type === 'topic') {
    const rows = await sql`
      UPDATE qa_topics SET name_en = ${name_en}, name_lu = ${name_lu || null}
      WHERE id = ${topicId} RETURNING *
    `;
    return NextResponse.json(rows[0]);
  }

  const { id, topic, question, question_lu, answer, answer_lu, scripture_refs, is_published } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const refs = scripture_refs || [];
  const rows = await sql`
    UPDATE bible_qa
    SET topic = ${topic}, question = ${question}, question_lu = ${question_lu || null},
        answer = ${answer}, answer_lu = ${answer_lu || null},
        scripture_refs = ${JSON.stringify(refs)}, is_published = ${is_published},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const topicId = searchParams.get('topicId');

  if (type === 'topic' && topicId) {
    await sql`DELETE FROM qa_topics WHERE id = ${parseInt(topicId)}`;
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await sql`DELETE FROM bible_qa WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
