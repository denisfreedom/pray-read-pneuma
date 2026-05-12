import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`SELECT * FROM live_stream_config ORDER BY id DESC LIMIT 1`;
  if (rows.length === 0) {
    return NextResponse.json({ is_live: false, stream_title: 'Live Teaching', stream_description: '' });
  }
  return NextResponse.json(rows[0]);
}

export async function POST(request: Request) {
  const { is_live, stream_title, stream_description } = await request.json();
  const rows = await sql`SELECT id FROM live_stream_config ORDER BY id DESC LIMIT 1`;
  if (rows.length === 0) {
    const result = await sql`
      INSERT INTO live_stream_config (is_live, stream_title, stream_description, updated_at)
      VALUES (${is_live}, ${stream_title}, ${stream_description}, NOW())
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  }
  const result = await sql`
    UPDATE live_stream_config
    SET is_live = ${is_live}, stream_title = ${stream_title}, stream_description = ${stream_description}, updated_at = NOW()
    WHERE id = ${rows[0].id}
    RETURNING *
  `;
  return NextResponse.json(result[0]);
}
