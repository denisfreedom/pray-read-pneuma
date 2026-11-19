// Paste into THE SAME FILE this route came from (do not rename it).
// FIXED route for Bible Q&A (bible_qa + qa_topics)
// What was broken:
//  1) No try/catch anywhere — if bible_qa / qa_topics didn't exist yet, the
//     first SELECT threw a 500 and admin showed "Failed to load Q&A entries".
//     Every handler now catches, and ensureTables() creates both tables
//     (CREATE TABLE IF NOT EXISTS) on first hit, so the first load returns
//     [] instead of a 500.
//  2) POST topic used ON CONFLICT (name_en) — fails if that unique constraint
//     was never created. Now SELECT-first, then INSERT or UPDATE. No
//     constraint needed.
//  3) PUT topic returned rows[0] = undefined when nothing matched.
//     Now 404s properly.
//  4) parseInt(id) on a bad id threw. Ids are validated (NaN → 400).
//  5) scripture_refs came back from the DB as a JSON string; the front
//     expects an array. Rows are normalised: refs always parsed to an array.
//  6) The list endpoint returned UNPUBLISHED rows too, so the front could
//     not trust it. Front should call ?published=true (published only).
//     Admin calls with no param (sees everything, incl. drafts).
import sql from "@/app/api/utils/sql";
import { NextRequest, NextResponse } from "next/server";

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS qa_topics (
    id SERIAL PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_lu TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS bible_qa (
    id SERIAL PRIMARY KEY,
    topic TEXT NOT NULL,
    question TEXT NOT NULL,
    question_lu TEXT,
    answer TEXT NOT NULL,
    answer_lu TEXT,
    scripture_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    slug TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function parseRefs(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch {}
    return v.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function normRow(r: any) {
  if (!r || typeof r !== "object") return r;
  return { ...r, scripture_refs: parseRefs(r.scripture_refs) };
}

function generateSlug(question: string): string {
  return question.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 100) + '-' + Date.now();
}

function badId(v: string | null) {
  if (!v) return true;
  const n = Number(v);
  return !Number.isFinite(n) || n <= 0 || !Number.isInteger(n);
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const topic = searchParams.get('topic');
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const publishedOnly = searchParams.get('published') === 'true';

    if (type === 'topics') {
      const rows = await sql`SELECT * FROM qa_topics ORDER BY name_en ASC`;
      return NextResponse.json(rows);
    }

    if (slug) {
      const rows = await sql`SELECT * FROM bible_qa WHERE slug = ${slug}`;
      if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(normRow(rows[0]));
    }

    if (id) {
      if (badId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
      const rows = await sql`SELECT * FROM bible_qa WHERE id = ${parseInt(id, 10)}`;
      if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(normRow(rows[0]));
    }

    if (topic) {
      const rows = publishedOnly
        ? await sql`SELECT * FROM bible_qa WHERE topic = ${topic} AND is_published = true ORDER BY created_at DESC`
        : await sql`SELECT * FROM bible_qa WHERE topic = ${topic} ORDER BY created_at DESC`;
      return NextResponse.json(rows.map(normRow));
    }

    const rows = publishedOnly
      ? await sql`SELECT * FROM bible_qa WHERE is_published = true ORDER BY topic ASC, created_at DESC`
      : await sql`SELECT * FROM bible_qa ORDER BY topic ASC, created_at DESC`;
    return NextResponse.json(rows.map(normRow));
  } catch (e: any) {
    console.error('bible-qa GET failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to load Q&A entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const body = await request.json().catch(() => ({}));
    const { type, name_en, name_lu } = body;

    // Create (or update) a topic — SELECT-first, no ON CONFLICT needed.
    if (type === 'topic') {
      if (!name_en || !String(name_en).trim()) return NextResponse.json({ error: 'name_en required' }, { status: 400 });
      const existing = await sql`SELECT * FROM qa_topics WHERE LOWER(name_en) = ${String(name_en).trim().toLowerCase()} LIMIT 1`;
      if (existing.length > 0) {
        const rows = await sql`UPDATE qa_topics SET name_lu = ${name_lu || null} WHERE id = ${existing[0].id} RETURNING *`;
        return NextResponse.json(rows[0], { status: 200 });
      }
      const rows = await sql`INSERT INTO qa_topics (name_en, name_lu) VALUES (${String(name_en).trim()}, ${name_lu || null}) RETURNING *`;
      return NextResponse.json(rows[0], { status: 201 });
    }

    const { topic, question, question_lu, answer, answer_lu, scripture_refs, is_published } = body;
    if (!topic || !question || !answer) {
      return NextResponse.json({ error: 'topic, question, and answer are required' }, { status: 400 });
    }
    const slug = generateSlug(String(question));
    const refs = parseRefs(scripture_refs);
    const published = is_published !== undefined ? !!is_published : true;
    const rows = await sql`
      INSERT INTO bible_qa (topic, question, question_lu, answer, answer_lu, scripture_refs, slug, is_published)
      VALUES (${topic}, ${question}, ${question_lu || null}, ${answer}, ${answer_lu || null}, ${JSON.stringify(refs)}::jsonb, ${slug}, ${published})
      RETURNING *
    `;
    return NextResponse.json(normRow(rows[0]), { status: 201 });
  } catch (e: any) {
    console.error('bible-qa POST failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureTables();
    const body = await request.json().catch(() => ({}));
    const { type, id: topicId, name_en, name_lu } = body;

    if (type === 'topic') {
      if (!topicId || badId(String(topicId))) return NextResponse.json({ error: 'Valid topic id is required' }, { status: 400 });
      if (!name_en || !String(name_en).trim()) return NextResponse.json({ error: 'name_en required' }, { status: 400 });
      const rows = await sql`
        UPDATE qa_topics SET name_en = ${String(name_en).trim()}, name_lu = ${name_lu || null}
        WHERE id = ${parseInt(String(topicId), 10)} RETURNING *
      `;
      if (rows.length === 0) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    const { id, topic, question, question_lu, answer, answer_lu, scripture_refs, is_published } = body;
    if (!id || badId(String(id))) return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    if (!topic || !question || !answer) {
      return NextResponse.json({ error: 'topic, question, and answer are required' }, { status: 400 });
    }
    const refs = parseRefs(scripture_refs);
    const rows = await sql`
      UPDATE bible_qa
      SET topic = ${topic}, question = ${question}, question_lu = ${question_lu || null},
          answer = ${answer}, answer_lu = ${answer_lu || null},
          scripture_refs = ${JSON.stringify(refs)}::jsonb, is_published = ${is_published !== undefined ? !!is_published : true},
          updated_at = NOW()
      WHERE id = ${parseInt(String(id), 10)}
      RETURNING *
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(normRow(rows[0]));
  } catch (e: any) {
    console.error('bible-qa PUT failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const topicId = searchParams.get('topicId');

    if (type === 'topic' && topicId) {
      if (badId(topicId)) return NextResponse.json({ error: 'Invalid topicId' }, { status: 400 });
      await sql`DELETE FROM qa_topics WHERE id = ${parseInt(topicId, 10)}`;
      return NextResponse.json({ success: true });
    }
    if (!id || badId(id)) return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    await sql`DELETE FROM bible_qa WHERE id = ${parseInt(id, 10)}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('bible-qa DELETE failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
