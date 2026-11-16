 'use client';
import { useState, useEffect } from 'react';

export const PRAYER_CATEGORIES = [
  { slug: 'morning', label: 'Morning Prayers' },
  { slug: 'evening', label: 'Evening Prayers' },
  { slug: 'healing', label: 'Healing' },
  { slug: 'thanksgiving', label: 'Thanksgiving' },
  { slug: 'repentance', label: 'Repentance' },
  { slug: 'intercession', label: 'Intercession' },
  { slug: 'family', label: 'Family' },
  { slug: 'children', label: 'Children' },
  { slug: 'marriage', label: 'Marriage' },
  { slug: 'work', label: 'Work & Business' },
  { slug: 'finances', label: 'Finances' },
  { slug: 'protection', label: 'Protection' },
  { slug: 'guidance', label: 'Guidance & Wisdom' },
  { slug: 'peace', label: 'Peace & Anxiety' },
  { slug: 'faith', label: 'Faith & Trust' },
  { slug: 'worship', label: 'Worship & Praise' },
  { slug: 'deliverance', label: 'Deliverance' },
  { slug: 'uganda', label: 'Uganda & Nations' },
  { slug: 'church', label: 'Church & Ministry' },
  { slug: 'seasonal', label: 'Seasonal & Special' },
] as const;

type Prayer = {
  id: string;
  title: string;
  category: string;
  english_text: string;
  luganda_text: string;
  scripture_refs: string;
  is_published: boolean;
  created_at?: string;
};

const emptyPrayer: Prayer = {
  id: '', title: '', category: 'morning',
  english_text: '', luganda_text: '',
  scripture_refs: '', is_published: true,
};

export default function PrayerLibraryAdmin() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [form, setForm] = useState<Prayer>(emptyPrayer);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prayer-library');
      if (res.ok) { const d = await res.json(); setPrayers(Array.isArray(d) ? d : d.prayers || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const save = async () => {
    if (!form.title.trim() || !form.english_text.trim()) return flash('❌ Please enter a title and English prayer text');
    setSaving(true);
    try {
      const payload = { ...form, id: editingId || undefined };
      const res = await fetch('/api/prayer-library', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Failed: ${res.status}`);
      flash(editingId ? '✅ Prayer updated!' : '✅ Prayer saved!');
      setForm(emptyPrayer); setEditingId(null); await load();
    } catch (e) { flash('❌ Error: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  const edit = (p: Prayer) => { setForm({ ...p }); setEditingId(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancel = () => { setForm(emptyPrayer); setEditingId(null); };
  const del = async (id: string) => {
    if (!confirm('Delete this prayer?')) return;
    try {
      const res = await fetch(`/api/prayer-library?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      flash('✅ Prayer deleted!'); await load();
    } catch (e) { flash('❌ Error: ' + (e instanceof Error ? e.message : String(e))); }
  };

  const filtered = prayers.filter((p) => {
    const okCat = filterCat === 'all' || p.category === filterCat;
    const q = search.toLowerCase();
    const okQ = !q || p.title.toLowerCase().includes(q) || p.english_text.toLowerCase().includes(q) || p.luganda_text.toLowerCase().includes(q);
    return okCat && okQ;
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">🙏 Prayer Library</h3>
      <p className="text-sm text-gray-500 mb-6">20 categories. Scripture refs like <code className="bg-gray-100 px-1 rounded">John 3:16</code> become clickable on the public page. One file, no database needed.</p>
      {message && <div className="mb-4 px-4 py-3 rounded-lg bg-blue-100 text-blue-800 font-medium">{message}</div>}

      <div className="mb-6 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-600">
        <h4 className="font-bold mb-4">{editingId ? '✏ Edit Prayer' : '➕ Add New Prayer'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm font-medium mb-2">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Morning Prayer for Strength" className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">Category *</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg">{PRAYER_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></div>
        </div>
        <div className="mb-4"><label className="block text-sm font-medium mb-2">Scripture References (comma separated)</label><input value={form.scripture_refs} onChange={(e) => setForm({ ...form, scripture_refs: e.target.value })} placeholder="Psalm 23:1, John 3:16" className="w-full px-3 py-2 border rounded-lg" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm font-medium mb-2">English Prayer *</label><textarea value={form.english_text} onChange={(e) => setForm({ ...form, english_text: e.target.value })} rows={8} placeholder="Write the prayer in English..." className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">Luganda Prayer</label><textarea value={form.luganda_text} onChange={(e) => setForm({ ...form, luganda_text: e.target.value })} rows={8} placeholder="Write the prayer in Luganda..." className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <label className="flex items-center gap-2 mb-4 text-sm font-medium"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4" /> Published (visible to users)</label>
        <div className="flex gap-3"><button onClick={save} disabled={saving} className="flex-1 bg-amber-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400">{saving ? '💾 Saving...' : editingId ? '✏ Update Prayer' : '💾 Save Prayer'}</button>{editingId && <button onClick={cancel} className="px-6 py-3 border rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>}</div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prayers..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg" />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All categories</option>{PRAYER_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">↻ Refresh</button>
      </div>

      {loading ? <p className="text-center py-8 text-gray-500">Loading...</p> : filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No prayers yet. Add one above.</p> : (
        <div className="space-y-3">{filtered.map((p) => (
          <div key={p.id} className="p-4 rounded-lg border flex justify-between items-start gap-4">
            <div className="flex-1"><h5 className="font-semibold">{p.title}</h5><p className="text-xs text-gray-500 mb-1">{PRAYER_CATEGORIES.find((c) => c.slug === p.category)?.label || p.category} • {p.is_published ? '✅ Published' : '❌ Draft'} {p.scripture_refs ? `• 📖 ${p.scripture_refs}` : ''}</p><p className="text-sm text-gray-600 line-clamp-2">{p.english_text}</p></div>
            <div className="flex gap-2 shrink-0"><button onClick={() => edit(p)} className="text-blue-600 bg-blue-50 px-3 py-1 rounded text-sm font-semibold">Edit</button><button onClick={() => del(p.id)} className="text-red-600 bg-red-50 px-3 py-1 rounded text-sm font-semibold">Delete</button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
