import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`
    SELECT * FROM live_sessions 
    WHERE is_published = TRUE AND scheduled_at >= NOW() - INTERVAL '2 hours'
    ORDER BY scheduled_at ASC
  `;
  return NextResponse.json(rows);
}
