import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const filePath = path.join(process.cwd(), 'data', 'prayer-library.json');
function readAll(): any[] {
  try { if (!fs.existsSync(filePath)) return []; return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return []; }
}
function writeAll(list: any[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
}
export async function GET() { return NextResponse.json(readAll()); }
export async function POST(req: Request) {
  const body = await req.json();
  const list = readAll();
  const item = { ...body, id: Date.now().toString(), created_at: new Date().toISOString() };
  list.unshift(item); writeAll(list);
  return NextResponse.json(item);
}
export async function PUT(req: Request) {
  const body = await req.json();
  const list = readAll();
  const idx = list.findIndex((x: any) => String(x.id) === String(body.id));
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  list[idx] = { ...list[idx], ...body }; writeAll(list);
  return NextResponse.json(list[idx]);
}
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  const list = readAll().filter((x: any) => String(x.id) !== String(id));
  writeAll(list);
  return NextResponse.json({ ok: true });
}
