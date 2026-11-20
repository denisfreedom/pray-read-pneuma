import { NextResponse } from 'next/server';
// app/api/db-tables/route.ts — DIAGNOSTIC ONLY, delete after offline is fixed.
// Connects via DATABASE_URL (pg) and lists every table + row count + 1 sample row
// from any table that looks like verses/books. This tells us the REAL table names.
export const dynamic = 'force-dynamic';
export async function GET(){
  const url = process.env.DATABASE_URL || '';
  if(!url) return NextResponse.json({ success:false, error:'No DATABASE_URL' });
  try{
    const pg:any = await import('pg').catch(()=>null);
    if(!pg?.Pool) return NextResponse.json({ success:false, error:'pg package not installed', hint:'Check package.json for pg / @prisma/client / drizzle' });
    const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized:false }, max:1, connectionTimeoutMillis: 8000 });
    const tablesRes = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    const tables = tablesRes.rows.map((r:any)=>r.table_name);
    const counts:any = {};
    const samples:any = {};
    for(const t of tables.slice(0,60)){
      try{
        const c = await pool.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
        counts[t] = c.rows[0]?.n ?? 0;
        // sample 1 row from likely bible tables
        if(/verse|book|chapter|bible|prayer|devot|comment|qa|question|insight/i.test(t) && counts[t]>0){
          const s = await pool.query(`SELECT * FROM "${t}" LIMIT 1`);
          const row = s.rows[0]||{};
          // truncate long text for readability
          const short:any={}; for(const k of Object.keys(row)){ const v=row[k]; short[k]= typeof v==='string' && v.length>200 ? v.slice(0,200)+'...' : v; }
          samples[t]=short;
        }
      }catch(e:any){ counts[t]='ERR '+String(e?.message||e).slice(0,120); }
    }
    await pool.end().catch(()=>{});
    return NextResponse.json({ success:true, tables, counts, samples, dbHost: url.split('@')[1]?.split('/')[0]||'hidden' });
  }catch(e:any){
    return NextResponse.json({ success:false, error: String(e?.message||e).slice(0,500) });
  }
}
