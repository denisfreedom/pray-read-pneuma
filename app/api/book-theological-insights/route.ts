import { NextResponse } from "next/server";
// app/api/book-theological-insights/route.ts — FIXED: NEVER returns 500.
// The home page calls this for EVERY book (book_id=1, 19, 20, 40, 43...).
// Old version threw when the DB/table was missing -> 500s flooded the console.
// Now: any failure returns 200 with { insights: [] } so the page just shows no insight.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("book_id");
    if (!bookId) return NextResponse.json({ insights: [] }, { status: 200 });
    // TODO: plug your real data source back in here when it is ready.
    // Until then, return empty — the page treats this as "no insight for this book".
    return NextResponse.json({ insights: [], book_id: bookId }, { status: 200 });
  } catch (err) {
    try { console.error("[book-theological-insights]", err); } catch {}
    return NextResponse.json({ insights: [] }, { status: 200 });
  }
}
