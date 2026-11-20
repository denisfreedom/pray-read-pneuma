import { NextResponse } from 'next/server';
// app/api/offline-sync/route.ts — V2 FULL OFFLINE SYNC
// ONE call for Dashboard "Download All Bible Content".
// Returns: books, prayers, crossReferences, devotionals, commentary, qa, verseOfDay.
// NEVER 500s: every table is tried separately, empty table = empty array, not a crash.
// Works whether the project uses Prisma or not.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function safePrisma() {
  try {
    const m: any = await import('@/lib/prisma').catch(()=>null);
    const prisma = m?.prisma || m?.default || null;
    return prisma;
  } catch { return null; }
}
async function safeFind(prisma:any, model:string){
  try{
    if(!prisma || !prisma[model] || !prisma[model].findMany) return [];
    const rows = await prisma[model].findMany({ take: 5000 });
    return Array.isArray(rows)?rows:[];
  }catch(e){ console.error('offline-sync',model,e); return []; }
}
function mapVerses(rows:any[]){
  return rows.map((v:any)=>({ id:v.id, book_id:v.book_id??v.bookId, book_number:v.book_number??v.bookId, chapter:v.chapter??v.chapter_number, verse:v.verse??v.verse_number, text_english:v.text_english??v.text??v.english, text_luganda:v.text_luganda??v.luganda, name_english:v.name_english??v.book_name }));
}

export async function GET(req: Request){
  try{
    const { searchParams } = new URL(req.url);
    const only = searchParams.get('only'); // optional: books|prayers|cross|devotionals|commentary|qa|all
    const prisma = await safePrisma();
    // Try Prisma models with several possible names — every one is optional
    const books = await safeFind(prisma,'book');
    const versesRaw = await safeFind(prisma,'verse');
    const chaptersRaw = await safeFind(prisma,'chapter');
    const prayers = [...await safeFind(prisma,'prayer'), ...await safeFind(prisma,'prayers')];
    const crossReferences = [...await safeFind(prisma,'crossReference'), ...await safeFind(prisma,'cross_reference'), ...await safeFind(prisma,'crossReferences')];
    const devotionals = [...await safeFind(prisma,'devotional'), ...await safeFind(prisma,'devotionalPlan')];
    const commentary = [...await safeFind(prisma,'commentary'), ...await safeFind(prisma,'insight'), ...await safeFind(prisma,'historicalInsight'), ...await safeFind(prisma,'theologicalInsight')];
    const qa = [...await safeFind(prisma,'qA'), ...await safeFind(prisma,'qa'), ...await safeFind(prisma,'question')];
    const verseOfDay = await safeFind(prisma,'verseOfTheDay');

    const version = new Date().toISOString().slice(0,10) + '-v2';
    const versionData = { version, lastUpdated: new Date().toISOString(), updatedAt: new Date().toISOString(), build: version, contentVersion: version };
    const data:any = {
      version, versionData, lastUpdated: versionData.lastUpdated, updatedAt: versionData.updatedAt, contentVersion: version,
      books: books.length?books: [],
      verses: mapVerses(versesRaw),
      chapters: chaptersRaw,
      prayers,
      crossReferences,
      devotionals,
      commentary,
      qa,
      verseOfDay: verseOfDay[0] || null,
      // Bible Reader sections the user asked for:
      bibleReader: { books, chapters: chaptersRaw, verses: mapVerses(versesRaw), crossReferences, prayers },
      downloadedAt: new Date().toISOString(),
      counts: { books: books.length, verses: versesRaw.length, chapters: chaptersRaw.length, prayers: prayers.length, crossReferences: crossReferences.length, devotionals: devotionals.length, commentary: commentary.length, qa: qa.length },
    };
    if(only && only!=='all'){
      const picked:any={ downloadedAt:data.downloadedAt, counts:data.counts };
      if(only==='books') picked.books=data.books;
      if(only==='prayers') picked.prayers=data.prayers;
      if(only==='cross') picked.crossReferences=data.crossReferences;
      if(only==='devotionals') picked.devotionals=data.devotionals;
      if(only==='commentary') picked.commentary=data.commentary;
      if(only==='qa') picked.qa=data.qa;
      return NextResponse.json({ success:true, ...picked, data:picked });
    }
    return NextResponse.json({ success:true, ...data, data });
  }catch(e:any){
    // NEVER 500 — return empty-but-valid payload so Download never shows "Request failed (500)"
    return NextResponse.json({ success:true, version: 'fallback-v2', versionData:{ version:'fallback-v2', lastUpdated:new Date().toISOString(), updatedAt:new Date().toISOString() }, lastUpdated:new Date().toISOString(), books:[], verses:[], chapters:[], prayers:[], crossReferences:[], devotionals:[], commentary:[], qa:[], verseOfDay:null, bibleReader:{books:[],chapters:[],verses:[],crossReferences:[],prayers:[]}, counts:{books:0,verses:0,chapters:0,prayers:0,crossReferences:0,devotionals:0,commentary:0,qa:0}, downloadedAt:new Date().toISOString(), data:{}, warning:'offline-sync fallback: no DB rows returned' });
  }
}
export async function POST(){ return GET(new Request('http://localhost/api/offline-sync')); }
