import { NextResponse } from 'next/server';
// app/api/offline-sync/route.ts — V6 REAL TABLES, CHUNKED
// Real tables (from /api/db-tables): bible_books, bible_verses, cross_references,
// verse_pray_read, chapter_introductions, book_introductions, book_commentaries,
// chapter_commentaries, verse_commentaries, book_closing_prayers, bible_outlines,
// devotional_entries, bible_qa, qa_topics.
// Usage: /api/offline-sync?table=bible_verses&offset=0&limit=5000
//        /api/offline-sync  -> counts + version only, no big payload
export const dynamic = 'force-dynamic';
const now = new Date().toISOString();
const versionObj = { id:'prayread-v6', name:'Pray-Read Bible', version: now.slice(0,10)+'-v6', versionString: now.slice(0,10)+'-v6', lastUpdated: now, updatedAt: now, languages:['english','luganda'], books:66 };
const versions = [{id:'english',name:'English',language:'english',books:66},{id:'luganda',name:'Luganda',language:'luganda',books:66}];
const ALLOWED = new Set(['bible_books','bible_verses','cross_references','verse_pray_read','chapter_introductions','book_introductions','book_commentaries','chapter_commentaries','verse_commentaries','book_closing_prayers','bible_outlines','devotional_entries','bible_qa','qa_topics','verse_songs']);
const ORDER: Record<string,string> = { bible_books:'id', bible_verses:'id', cross_references:'id', verse_pray_read:'id', chapter_introductions:'id', book_introductions:'id', book_commentaries:'id', chapter_commentaries:'id', verse_commentaries:'id', book_closing_prayers:'id', bible_outlines:'id', devotional_entries:'id', bible_qa:'id', qa_topics:'id', verse_songs:'id' };

export async function GET(req: Request){
  const base:any = { success:true, version: versionObj, versionData: versionObj, versionString: versionObj.versionString, versions, bibleVersions: versions, lastUpdated: now, updatedAt: now, downloadedAt: now };
  try{
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const offset = Math.max(0, parseInt(searchParams.get('offset')||'0',10)||0);
    const limit = Math.min(5000, Math.max(1, parseInt(searchParams.get('limit')||'5000',10)||5000));
    const pg:any = await import('pg').catch(()=>null);
    if(!pg?.Pool) return NextResponse.json({ ...base, error:'pg not installed' });
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1, connectionTimeoutMillis:8000 });
    try{
      if(table){
        if(!ALLOWED.has(table)) return NextResponse.json({ ...base, error:'Unknown table: '+table });
        const order = ORDER[table]||'id';
        const rows = await pool.query(`SELECT * FROM "${table}" ORDER BY "${order}" ASC LIMIT $1 OFFSET $2`, [limit, offset]);
        const cnt = await pool.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
        const total = cnt.rows[0]?.n||0;
        await pool.end().catch(()=>{});
        return NextResponse.json({ ...base, table, offset, limit, total, hasMore: offset+rows.rows.length<total, rows: rows.rows, data:{ version: versionObj, versions, rows: rows.rows, total } });
      }
      // No table = counts only (fast, no big payload)
      const counts:any={}; for(const t of ALLOWED){ try{ const c=await pool.query(`SELECT COUNT(*)::int AS n FROM "${t}"`); counts[t]=c.rows[0]?.n||0; }catch{ counts[t]=0; } }
      await pool.end().catch(()=>{});
      const tables = Object.keys(counts);
      return NextResponse.json({ ...base, tables, counts, data:{ version: versionObj, versions, counts, tables } });
    }catch(e:any){ await pool.end().catch(()=>{}); throw e; }
  }catch(e:any){
    return NextResponse.json({ ...base, error: String(e?.message||e).slice(0,500), counts:{}, data:{ version: versionObj, versions } });
  }
}
