// components/admin/PrayerLibraryAdmin.tsx — DROP-IN ADMIN TAB for Prayer Library
// Paste this file, then add ONE tab line to app/admin_panel/page.tsx (see patch below).
// HOW IT WORKS (no database version): it lists the categories/prayers from lib/prayer-library-data.ts,
// lets you Add / Edit / Delete in the browser, Preview exactly like the public page,
// then gives you the updated code to paste back into lib/prayer-library-data.ts on GitHub.
// That is the same GitHub-only workflow your whole site already uses.
"use client";
import { useMemo, useState } from "react";
import { PRAYER_CATEGORIES, PRAYERS, type Prayer, type PrayerCategory } from "@/lib/prayer-library-data";
import PrayerContent from "@/components/PrayerContent";

function slugify(s:string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||"prayer"; }

export default function PrayerLibraryAdmin(){
  const [cats,setCats]=useState<PrayerCategory[]>(PRAYER_CATEGORIES);
  const [prayers,setPrayers]=useState<Prayer[]>(PRAYERS);
  const [tab,setTab]=useState<"prayers"|"categories"|"new-prayer"|"new-category">("prayers");
  const [editing,setEditing]=useState<Prayer|null>(null);
  const [editingCat,setEditingCat]=useState<PrayerCategory|null>(null);
  const [preview,setPreview]=useState<Prayer|null>(null);
  const [search,setSearch]=useState("");
  const [copied,setCopied]=useState(false);
  const [form,setForm]=useState({title:"",subtitle:"",categorySlug:"worship-and-adoration",introduction:"",content:"",status:"published" as "published"|"draft"});
  const [catForm,setCatForm]=useState({name:"",description:"",introduction:"",icon:"BookOpen",status:"published" as "published"|"draft"});

  const filtered=useMemo(()=>prayers.filter(p=>!search||(p.title+p.subtitle+p.introduction).toLowerCase().includes(search.toLowerCase())),[prayers,search]);
  const totalVisits=prayers.reduce((a,p)=>a+(p.visitCount||0),0);

  const savePrayer=()=>{
    if(!form.title.trim()||!form.introduction.trim()||!form.content.trim()){ alert("Title, Introduction and Prayer Content are required."); return; }
    const slug=editing?editing.slug:slugify(form.title);
    const rec:Prayer={slug,title:form.title,subtitle:form.subtitle,categorySlug:form.categorySlug,introduction:form.introduction,content:form.content,status:form.status,order:editing?editing.order:prayers.length,visitCount:editing?editing.visitCount:0};
    setPrayers(editing?prayers.map(p=>p.slug===editing.slug?rec:p):[...prayers,rec]);
    setEditing(null); setForm({title:"",subtitle:"",categorySlug:"worship-and-adoration",introduction:"",content:"",status:"published"}); setTab("prayers");
  };
  const saveCategory=()=>{
    if(!catForm.name.trim()){ alert("Category name is required."); return; }
    const slug=editingCat?editingCat.slug:slugify(catForm.name);
    const rec:PrayerCategory={slug,name:catForm.name,description:catForm.description,introduction:catForm.introduction,icon:catForm.icon,order:editingCat?editingCat.order:cats.length,status:catForm.status};
    setCats(editingCat?cats.map(c=>c.slug===editingCat.slug?rec:c):[...cats,rec]);
    setEditingCat(null); setCatForm({name:"",description:"",introduction:"",icon:"BookOpen",status:"published"}); setTab("categories");
  };
  const deletePrayer=(slug:string)=>{ if(confirm("Delete this prayer? This cannot be undone.")) setPrayers(prayers.filter(p=>p.slug!==slug)); };
  const deleteCategory=(slug:string)=>{
    const count=prayers.filter(p=>p.categorySlug===slug).length;
    if(count>0){ alert(`This category has ${count} prayer(s). Reassign or delete those prayers first, or move them to another category before deleting.`); return; }
    if(confirm("Delete this category?")) setCats(cats.filter(c=>c.slug!==slug));
  };
  const exportCode=()=>{
    const code=`// lib/prayer-library-data.ts — updated from Admin Panel\nimport type { PrayerCategory, Prayer } from "@/lib/prayer-library-data";\n// Paste the arrays below over the existing PRAYER_CATEGORIES and PRAYERS in that file.\nexport const PRAYER_CATEGORIES = ${JSON.stringify(cats,null,2)};\nexport const PRAYERS = ${JSON.stringify(prayers,null,2)};`;
    navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };
  const startEdit=(p:Prayer)=>{ setEditing(p); setForm({title:p.title,subtitle:p.subtitle||"",categorySlug:p.categorySlug,introduction:p.introduction,content:p.content,status:p.status}); setTab("new-prayer"); };
  const startEditCat=(c:PrayerCategory)=>{ setEditingCat(c); setCatForm({name:c.name,description:c.description,introduction:c.introduction,icon:c.icon,status:c.status}); setTab("new-category"); };

  return (<div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-2xl font-bold">🙏 Prayer Library</h2><p className="text-sm text-gray-500">Manage categories & prayers. Changes here are previewed instantly — then click Export to save them to GitHub.</p></div>
      <button onClick={exportCode} className="rounded-full bg-[#1d4035] px-5 py-2.5 text-sm font-semibold text-white">{copied?"✓ Copied — paste into GitHub":"📋 Export — Copy Code for GitHub"}</button>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[[ "Categories", String(cats.length)],["Published Prayers", String(prayers.filter(p=>p.status==="published").length)],["Draft Prayers", String(prayers.filter(p=>p.status==="draft").length)],["Total Prayer Visits", String(totalVisits)]].map(([l,v])=>(<div key={l} className="rounded-2xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>))}
    </div>
    <div className="flex flex-wrap gap-2">
      {(["prayers","categories","new-prayer","new-category"] as const).map(t=>(<button key={t} onClick={()=>setTab(t)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab===t?"bg-[#1d4035] text-white":"border bg-white"}`}>{t==="prayers"?"View All Prayers":t==="categories"?"View Categories":t==="new-prayer"?(editing?"Edit Prayer":"+ Add New Prayer"):(editingCat?"Edit Category":"+ Add New Category")}</button>))}
    </div>
    {tab==="prayers" && (<div className="space-y-3">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search prayers by title…" className="w-full rounded-xl border px-4 py-3" />
      {filtered.length===0 && <p className="rounded-xl bg-white p-6 text-center text-gray-500">No prayers found. Click “+ Add New Prayer” to create one.</p>}
      {filtered.map(p=>(<div key={p.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div className="min-w-0"><p className="font-semibold">{p.title}</p><p className="text-sm text-gray-500">{p.subtitle||""} • {cats.find(c=>c.slug===p.categorySlug)?.name||p.categorySlug} • {p.status} • {p.visitCount} visits</p></div><div className="flex gap-2"><button onClick={()=>setPreview(p)} className="rounded-full border px-3 py-1.5 text-sm">Preview</button><button onClick={()=>startEdit(p)} className="rounded-full border px-3 py-1.5 text-sm">Edit</button><button onClick={()=>deletePrayer(p.slug)} className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600">Delete</button></div></div>))}
    </div>)}
    {tab==="categories" && (<div className="space-y-3">{cats.map(c=>{ const n=prayers.filter(p=>p.categorySlug===c.slug).length; return (<div key={c.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><p className="font-semibold">{c.name}</p><p className="text-sm text-gray-500">{c.description} • {n} prayer(s) • {c.status}</p></div><div className="flex gap-2"><button onClick={()=>startEditCat(c)} className="rounded-full border px-3 py-1.5 text-sm">Edit</button><button onClick={()=>deleteCategory(c.slug)} className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600">Delete</button></div></div>); })}</div>)}
    {tab==="new-prayer" && (<div className="space-y-4 rounded-2xl border bg-white p-5">
      <h3 className="font-bold">{editing?"Edit Prayer":"Add New Prayer"}</h3>
      <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Prayer Heading * (e.g. The Excellency of God's Holiness)" className="w-full rounded-xl border px-4 py-3" />
      <input value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} placeholder="Subtitle (optional)" className="w-full rounded-xl border px-4 py-3" />
      <label className="block text-sm font-medium">Category *<select value={form.categorySlug} onChange={e=>setForm({...form,categorySlug:e.target.value})} className="mt-1 w-full rounded-xl border px-4 py-3">{cats.map(c=>(<option key={c.slug} value={c.slug}>{c.name}</option>))}</select></label>
      <label className="block text-sm font-medium">Introduction *<textarea value={form.introduction} onChange={e=>setForm({...form,introduction:e.target.value})} rows={4} placeholder="Biblical foundation of this prayer…" className="mt-1 w-full rounded-xl border px-4 py-3" /></label>
      <label className="block text-sm font-medium">Prayer Points / Prayer Content * — use &lt;h3&gt;, &lt;p&gt;, &lt;em&gt;, &lt;strong&gt;. Write Scripture refs like Genesis 1:1 or Gen. 1:1 — they become clickable popups.<textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} rows={12} placeholder="<h3>1. Beholding His Holiness</h3><p>Father, we worship You… Genesis 1:1 …</p>" className="mt-1 w-full rounded-xl border px-4 py-3 font-mono text-sm" /></label>
      <label className="block text-sm font-medium">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as any})} className="mt-1 w-full rounded-xl border px-4 py-3"><option value="published">Published</option><option value="draft">Save as Draft</option></select></label>
      <div className="flex gap-2"><button onClick={savePrayer} className="rounded-full bg-[#1d4035] px-6 py-3 text-sm font-semibold text-white">{editing?"Update Prayer":"Save Prayer"}</button><button onClick={()=>setPreview({slug:slugify(form.title)||"preview",title:form.title||"Preview",subtitle:form.subtitle,categorySlug:form.categorySlug,introduction:form.introduction,content:form.content,status:form.status,order:0,visitCount:0})} className="rounded-full border px-6 py-3 text-sm">Preview Before Publishing</button></div>
      <p className="text-xs text-gray-500">After saving, click “Export — Copy Code for GitHub” at the top, then paste it over <code>lib/prayer-library-data.ts</code> on GitHub and commit. That publishes it live.</p>
    </div>)}
    {tab==="new-category" && (<div className="space-y-4 rounded-2xl border bg-white p-5">
      <h3 className="font-bold">{editingCat?"Edit Category":"Add New Category"}</h3>
      <input value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value})} placeholder="Category name * (e.g. Prayers for Healing)" className="w-full rounded-xl border px-4 py-3" />
      <input value={catForm.description} onChange={e=>setCatForm({...catForm,description:e.target.value})} placeholder="Short description" className="w-full rounded-xl border px-4 py-3" />
      <textarea value={catForm.introduction} onChange={e=>setCatForm({...catForm,introduction:e.target.value})} rows={4} placeholder="Detailed introduction — spiritual significance…" className="w-full rounded-xl border px-4 py-3" />
      <label className="block text-sm font-medium">Status<select value={catForm.status} onChange={e=>setCatForm({...catForm,status:e.target.value as any})} className="mt-1 w-full rounded-xl border px-4 py-3"><option value="published">Published</option><option value="draft">Draft</option></select></label>
      <button onClick={saveCategory} className="rounded-full bg-[#1d4035] px-6 py-3 text-sm font-semibold text-white">{editingCat?"Update Category":"Save Category"}</button>
    </div>)}
    {preview && (<div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onClick={()=>setPreview(null)}><div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 sm:p-8" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h3 className="font-serif text-2xl">{preview.title}</h3><button onClick={()=>setPreview(null)} className="rounded-full bg-gray-100 px-3 py-1">✕ Close</button></div>{preview.subtitle && <p className="mt-1 italic text-gray-500">{preview.subtitle}</p>}<p className="mt-4 text-gray-700">{preview.introduction}</p><div className="mt-6"><PrayerContent html={preview.content} /></div><p className="mt-6 text-xs text-gray-400">Preview — looks like the public prayer scroll. Scripture refs are clickable here too.</p></div></div>)}
  </div>);
}
