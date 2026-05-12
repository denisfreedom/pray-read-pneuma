import sql from "@/app/api/utils/sql";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`SELECT * FROM community_revelations ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { user_email, user_name, title, content, scripture_ref } = await request.json();
  if (!user_email || !title || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const result = await sql`
    INSERT INTO community_revelations (user_email, user_name, title, content, scripture_ref)
    VALUES (${user_email}, ${user_name || "Anonymous"}, ${title}, ${content}, ${scripture_ref || null})
    RETURNING *
  `;
  return NextResponse.json(result[0], { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id } = await request.json();
  const result = await sql`
    UPDATE community_revelations SET likes_count = likes_count + 1 WHERE id = ${id} RETURNING likes_count
  `;
  return NextResponse.json(result[0]);
}
