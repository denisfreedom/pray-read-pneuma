import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// app/api/list-routes/route.ts — DIAGNOSTIC ONLY, delete after we fix offline.
// Lists every /api route + every data/bible file in the repo, so we can see
// where the Bible Reader REALLY gets its verses from.
export const dynamic = 'force-dynamic';
function walk(dir:string, base:string, out:string[]=[]):string[]{
  try{
    for(const e of fs.readdirSync(dir, { withFileTypes:true })){
      const full = path.join(dir, e.name);
      const rel = path.relative(base, full).replace(/\\/g,'/');
      if(e.isDirectory()){ if(!['node_modules','.next','.git'].includes(e.name)) walk(full, base, out); }
      else out.push(rel);
    }
  }catch{}
  return out;
}
export async function GET(){
  const root = process.cwd();
  const apiFiles = walk(path.join(root,'app','api'), root).filter(f=>f.endsWith('route.ts'));
  const dataFiles = walk(path.join(root,'app'), root).filter(f=>/bible|verse|supabase|data/i.test(f) && (f.endsWith('.ts')||f.endsWith('.tsx')||f.endsWith('.json'))).slice(0,200);
  const publicFiles = walk(path.join(root,'public'), root).filter(f=>/bible|verse|data|json/i.test(f)).slice(0,200);
  const envKeys = Object.keys(process.env).filter(k=>/SUPABASE|DATABASE|NEXT_PUBLIC/i.test(k));
  return NextResponse.json({ success:true, apiRoutes: apiFiles, bibleDataFiles: dataFiles, publicDataFiles: publicFiles, envKeysPresent: envKeys, cwd: root });
}
