import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// NOTE: On Vercel the filesystem is READ-ONLY in production, so POST/PUT/DELETE
// cannot permanently save here. The admin panel now saves to the browser first
// and asks you to Export JSON -> paste into data/prayer-library.json in GitHub.
// This route still works fully on localhost / any writable server, and it now
// returns real JSON errors instead of a blank 500 HTML page.
const filePath = path.join(process.cwd(), 'data', 'prayer-library.json');

function readAll(): any[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : parsed.prayers || [];
  } catch { return []; }
}
function writeAll(list: any[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}

export async function GET() {
  return NextResponse.json(readAll());
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !String(body.title || '').trim() || !String(body.english_text || '').trim()) {
      return NextResponse.json({ error: 'Title and English prayer text are required.' }, { status: 400 });
    }
    const list = readAll();
    const item = { ...body, id: body.id || Date.now().toString(), created_at: body.created_at || new Date().toISOString() };
    list.unshift(item);
    writeAll(list);
    return NextResponse.json(item);
  } catch (e: any) {
    // EROFS / EACCES on Vercel — tell the admin panel the truth so it can fall back to localStorage + Export.
    return NextResponse.json({ error: `Server cannot write prayer file: ${e?.message || 'write failed'}. Use Export JSON in the admin panel and paste it into data/prayer-library.json in GitHub.` }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const list = readAll();
    const idx = list.findIndex((x: any) => String(x.id) === String(body.id));
    if (idx === -1) return NextResponse.json({ error: 'Not found — this prayer only exists in the browser. Export JSON to GitHub first.' }, { status: 404 });
    list[idx] = { ...list[idx], ...body };
    writeAll(list);
    return NextResponse.json(list[idx]);
  } catch (e: any) {
    return NextResponse.json({ error: `Server cannot write prayer file: ${e?.message || 'write failed'}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    const list = readAll().filter((x: any) => String(x.id) !== String(id));
    writeAll(list);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: `Server cannot write prayer file: ${e?.message || 'write failed'}` }, { status: 500 });
  }
}
