"use client";
// app/components/DashboardBookmarks.tsx — DROP-IN for Dashboard
// Paste: import DashboardBookmarks from '@/app/components/DashboardBookmarks';
// then <DashboardBookmarks /> anywhere inside your Dashboard page.
// Reads what the devotional reader saves: localStorage 'pr_bookmarked_devotionals'
// (also per-user: pr_bookmarked_devotionals_<email>).
// Also shows that user's highlights count from pr_highlights_<email>.
import { useEffect, useState } from 'react';
import Link from 'next/link';
type BM = { num: string; title: string; scripture: string; at?: string };
function userKey(): string { try { const e = (localStorage.getItem('userEmail') || localStorage.getItem('user_email') || '').trim().toLowerCase(); if (e) return e.replace(/[^a-z0-9@._-]/g, '_'); } catch {} return 'guest'; }
export default function DashboardBookmarks() {
  const [items, setItems] = useState<BM[]>([]);
  const [hlCount, setHlCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  function load() {
    try {
      const uk = userKey();
      const a = JSON.parse(localStorage.getItem(`pr_bookmarked_devotionals_${uk}`) || '[]');
      const b = JSON.parse(localStorage.getItem('pr_bookmarked_devotionals') || '[]');
      const seen = new Map<string, BM>();
      [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((x: any) => { if (x?.num && !seen.has(x.num)) seen.set(x.num, x); });
      setItems([...seen.values()]);
      const hl = JSON.parse(localStorage.getItem(`pr_highlights_${uk}`) || '[]');
      setHlCount(Array.isArray(hl) ? hl.length : 0);
      const d = JSON.parse(localStorage.getItem('pr_done_devotionals') || '[]');
      setDoneCount(Array.isArray(d) ? d.length : 0);
    } catch {}
  }
  useEffect(() => { load(); const t = setInterval(load, 3000); const onF = () => load(); window.addEventListener('focus', onF); return () => { clearInterval(t); window.removeEventListener('focus', onF); }; }, []);
  function removeOne(num: string) {
    const next = items.filter(i => i.num !== num); setItems(next);
    try { const uk = userKey(); localStorage.setItem(`pr_bookmarked_devotionals_${uk}`, JSON.stringify(next)); localStorage.setItem('pr_bookmarked_devotionals', JSON.stringify(next)); } catch {}
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e7de', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#17372f' }}>🔖 My Bookmarked Devotionals</h3>
        <span style={{ fontSize: 13, color: '#6b7280' }}>🖍 {hlCount} highlight{hlCount === 1 ? '' : 's'} saved &nbsp;·&nbsp; ✓ {doneCount} completed</span>
      </div>
      {items.length === 0 ? (
        <p style={{ color: '#6b7280', margin: '12px 0 0', fontSize: 14 }}>No bookmarks yet. Open any devotional and tap <b>🔖 Bookmark to Dashboard</b> — it will appear here.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {items.map(b => (
            <div key={b.num} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#f8f6ef', border: '1px solid #e8e7de', borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ background: '#17372f', color: '#e9c981', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>D-{String(b.num).padStart(3, '0')}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14, color: '#1c352d' }}>{b.title}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{b.scripture}</div></div>
              <Link href={`/devotional-plans?devotional=D-${String(b.num).padStart(3, '0')}`} style={{ background: '#1d4035', color: '#fff', fontWeight: 700, fontSize: 13, padding: '7px 14px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap' }}>Read →</Link>
              <button onClick={() => removeOne(b.num)} title="Remove bookmark" style={{ cursor: 'pointer', border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: 999, width: 28, height: 28 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#6b7280', margin: '12px 0 0' }}>Bookmarks & highlights are saved per user — another person logging in on this device sees only their own.</p>
    </div>
  );
}
