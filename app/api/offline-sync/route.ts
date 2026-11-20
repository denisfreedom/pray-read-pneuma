import { NextResponse } from 'next/server';
// app/api/offline-sync/route.ts — V5 REAL DATA SOURCE
// V2-V4 returned [] because they only tried Prisma, and this app does NOT store
// the Bible in Prisma. V5 tries: 1) Supabase, 2) internal Bible APIs, 3) Prisma.
// Returns the first source that actually has verses. Never 500, always version.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const now = new Date().toISOString();
const versionObj = { id:'prayread-v5', name:'Pray-Read Bible', version: now.slice(0,10)+'-v5', versionString: now.slice(0,10)+'-v5', lastUpdated: now, updatedAt: now, languages:['english','luganda'], books:66 };
const versions = [
  { id:'english', name:'English', language:'english', books:66 },
  { id:'luganda', name:'Luganda', language:'luganda', books:66 },
];

async function trySupabase(){
  try{
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url || !key) return null;
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth:{ persistSession:false } });
    const get = async (table:string, limit=5000)=>{
      try{ const { data, error } = await (sb as any).from(table).select('*').limit(limit); if(error) return []; return data||[]; }catch{ return []; }
    };
    // Try several table names — first hit wins per section
    const books = (await get('books')).length? await get('books') : await get('bible_books');
    const verses = (await get('verses')).length? await get('verses') : (await get('bible_verses')).length? await get('bible_verses') : await get('verse');
    if(!verses.length && !books.length) return null;
    const devotionals = (await get('devotionals')).length? await get('devotionals') : await get('devotional_plans');
    const commentary = (await get('commentary')).length? await get('commentary') : await get('insights');
    const qa = (await get('qa')).length? await get('qa') : await get('bible_qa');
    const prayers = (await get('prayers')).length? await get('prayers') : await get('prayer');
    const cross = (await get('cross_references')).length? await get('cross_references') : await get('crossReferences');
    return { source:'supabase', books, verses, devotionals, commentary, qa, prayers, crossReferences: cross, chapters: [] };
  }catch(e){ console.error('supabase offline-sync', e); return null; }
}

async function tryInternalAPIs(req: Request){
  try{
    const origin = new URL(req.url).origin;
    const base = process.env.NEXT_PUBLIC_SITE_URL || origin;
    const fetchJson = async (path:string)=>{
      try{ const r = await fetch(base+path, { cache:'no-store' }); if(!r.ok) return null; return await r.json().catch(()=>null); }catch{ return null; }
    };
    // Books list from the same API the Reader uses
    const booksJson = await fetchJson('/api/bible/books') || await fetchJson('/api/books') || await fetchJson('/api/bible');
    const books = booksJson?.books || booksJson?.data || (Array.isArray(booksJson)?booksJson:[]);
    if(!books.length) return null;
    const verses:any[] = [];
    const chapters:any[] = [];
    // Fetch every book/chapter — same endpoints the Reader uses. Try 2 shapes per chapter.
    for(let bi=0; bi<books.length; bi++){
      const b:any = books[bi]; const bid = b.id ?? b.book_id ?? (bi+1);
      const chJson = await fetchJson(`/api/bible/books/${bid}/chapters`) || await fetchJson(`/api/bible/${bid}/chapters`);
      const chList = chJson?.chapters || chJson?.data || (Array.isArray(chJson)?chJson:[]);
      const maxCh = chList.length || b.chapters || b.chapter_count || 50;
      const count = typeof maxCh==='number'? maxCh : 50;
      for(let ch=1; ch<=Math.min(count,150); ch++){
        let vj = await fetchJson(`/api/bible/books/${bid}/chapters/${ch}`);
        if(!vj) vj = await fetchJson(`/api/bible/${bid}/${ch}`);
        if(!vj) vj = await fetchJson(`/api/verses?book=${bid}&chapter=${ch}`);
        const vs = vj?.verses || vj?.data || vj?.chapter?.verses || (Array.isArray(vj)?vj:[]);
        if(Array.isArray(vs) && vs.length){ chapters.push({ book_id:bid, chapter:ch, verses:vs.length }); for(const v of vs) verses.push(v); }
      }
    }
    if(!verses.length) return null;
    const devJ = await fetchJson('/api/devotionals'); const devotionals = devJ?.devotionals || devJ?.data || [];
    const comJ = await fetchJson('/api/insights'); const commentary = comJ?.insights || comJ?.data || [];
    const qaJ = await fetchJson('/api/qa'); const qa = qaJ?.questions || qaJ?.data || [];
    const prayJ = await fetchJson('/api/prayers'); const prayers = prayJ?.prayers || prayJ?.data || [];
    const crossJ = await fetchJson('/api/cross-references'); const cross = crossJ?.crossReferences || crossJ?.data || [];
    const vodJ = await fetchJson('/api/verse-of-the-day');
    return { source:'internal-apis', books, verses, devotionals, commentary, qa, prayers, crossReferences: cross, chapters, verseOfDay: vodJ?.verse || null };
  }catch(e){ console.error('internal offline-sync', e); return null; }
}

export async function GET(req: Request){
  const base:any = { success:true, version: versionObj, versionData: versionObj, versionString: versionObj.versionString, versions, bibleVersions: versions, lastUpdated: now, updatedAt: now, downloadedAt: now };
  try{
    let result:any = await trySupabase();
    if(!result || !result.verses?.length) { const viaApi = await tryInternalAPIs(req); if(viaApi) result = viaApi; }
    if(!result) {
      // Last resort: Prisma (old path) — may be empty, but never crash
      try{
        const m:any = await import('@/lib/prisma').catch(()=>null);
        const prisma = m?.prisma || m?.default || null;
        if(prisma?.verse?.findMany){ const verses = await prisma.verse.findMany({ take:5000 }).catch(()=>[]); const books = await prisma.book?.findMany({ take:100 }).catch(()=>[]) || []; if(verses.length) result = { source:'prisma', books, verses, devotionals:[], commentary:[], qa:[], prayers:[], crossReferences:[], chapters:[] }; }
      }catch{}
    }
    if(!result) {
      return NextResponse.json({ ...base, source:'none', books:[], verses:[], chapters:[], devotionals:[], commentary:[], qa:[], prayers:[], crossReferences:[], verseOfDay:null, counts:{books:0,verses:0,devotionals:0,commentary:0,qa:0,prayers:0,crossReferences:0}, warning:'No data source returned verses — check Supabase env vars and /api/bible/books', data:{ version: versionObj, versions } });
    }
    const counts = { books: result.books?.length||0, verses: result.verses?.length||0, chapters: result.chapters?.length||0, devotionals: result.devotionals?.length||0, commentary: result.commentary?.length||0, qa: result.qa?.length||0, prayers: result.prayers?.length||0, crossReferences: result.crossReferences?.length||0 };
    return NextResponse.json({ ...base, source: result.source, books: result.books||[], verses: result.verses||[], chapters: result.chapters||[], devotionals: result.devotionals||[], commentary: result.commentary||[], qa: result.qa||[], prayers: result.prayers||[], crossReferences: result.crossReferences||[], verseOfDay: result.verseOfDay||null, bibleReader:{ books: result.books||[], chapters: result.chapters||[], verses: result.verses||[], crossReferences: result.crossReferences||[], prayers: result.prayers||[] }, counts, data:{ version: versionObj, versions, ...result, counts } });
  }catch(e:any){
    return NextResponse.json({ ...base, source:'error', books:[], verses:[], chapters:[], devotionals:[], commentary:[], qa:[], prayers:[], crossReferences:[], verseOfDay:null, counts:{books:0,verses:0,devotionals:0,commentary:0,qa:0,prayers:0,crossReferences:0}, warning: String(e?.message||e), data:{ version: versionObj, versions } });
  }
}
export async function POST(){ return GET(new Request('http://localhost/api/offline-sync')); }
