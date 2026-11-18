import { NextResponse } from "next/server";
// app/api/content-updates/check/route.ts — NEVER 500s.
// The old version touched the DB / a missing table and threw -> 500 on every
// home-page load. The bell only needs { updates: [], hasUpdates: false }.
// This version returns that for GET and POST, no matter what the body is.

export const dynamic = "force-dynamic";

function ok() {
  return NextResponse.json({ updates: [], hasUpdates: false, count: 0 }, { status: 200 });
}

export async function GET() {
  try { return ok(); } catch { return ok(); }
}

export async function POST(req: Request) {
  try {
    // Read + discard the body so a bad / empty body can never throw.
    try { await req.json().catch(() => null); } catch {}
    return ok();
  } catch {
    return ok();
  }
}
