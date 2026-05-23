'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Save, X, ChevronDown, ChevronUp, Eye, EyeOff, Tag, Globe } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import RichTextEditor from '../components/RichTextEditor';

// Strip --tw-* CSS vars, background-color, text-shadow, etc. from stored HTML
const SAFE_PROPS = new Set(['font-family','font-size','font-weight','font-style','color','text-decoration','text-decoration-line']);
function cleanHtml(raw: string): string {
  if (!raw || typeof window === 'undefined') return raw;
  if (!raw.includes('--tw-') && !raw.includes('background') && !raw.includes('shadow')) return raw;
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    const w = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null, false as any);
    let n = w.nextNode();
    while (n) {
      const el = n as Element;
      if (el.hasAttribute('style')) {
        const clean = (el.getAttribute('style') || '').split(';').map(s => s.trim()).filter(s => {
          if (!s) return false;
          const p = s.split(':')[0].trim().toLowerCase();
          return !p.startsWith('--') && SAFE_PROPS.has(p);
        }).join('; ');
        clean ? el.setAttribute('style', clean) : el.removeAttribute('style');
      }
      n = w.nextNode();
    }
    return tmp.innerHTML;
  } catch { return raw; }
}

interface ScriptureRef {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
}

interface QA {
  id: number;
  topic: string;
  question: string;
  question_lu: string | null;
  answer: string;
  answer_lu: string | null;
  scripture_refs: ScriptureRef[];
  slug: string;
  is_published: boolean;
  created_at: string;
}

interface Topic {
  id: number;
  name_en: string;
  name_lu: string | null;
}

function ScriptureRefInput({ refs, onChange }: { refs: ScriptureRef[]; onChange: (refs: ScriptureRef[]) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const parseRef = (raw: string): ScriptureRef | null => {
    const match = raw.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return null;
    return { ref: raw.trim(), book: match[1].trim(), chapter: parseInt(match[2]), verse: parseInt(match[3]) };
  };

  const addRef = () => {
    const parsed = parseRef(input);
    if (!parsed) { setError('Use format: Book Chapter:Verse (e.g. John 3:16)'); return; }
    if (refs.find(r => r.ref === parsed.ref)) { setError('Already added'); return; }
    onChange([...refs, parsed]);
    setInput('');
    setError('');
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input type="text" value={input} onChange={e => { setInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRef())}
          placeholder="e.g. John 3:16"
          className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-sm" />
        <button type="button" onClick={addRef}
          className="px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-sm font-medium flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refs.map((ref, i) => (
            <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium">
              <BookOpen className="w-3.5 h-3.5" />{ref.ref}
              <button type="button" onClick={() => onChange(refs.filter((_, j) => j !== i))} className="ml-1 text-blue-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CpanelQA() {
  const [qaList, setQaList] = useState<QA[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'topics'>('questions');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterTopic, setFilterTopic] = useState('All');
  const [answerLang, setAnswerLang] = useState<'en' | 'lu'>('en');

  // Q&A form state
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [questionLu, setQuestionLu] = useState('');
  const [answer, setAnswer] = useState('<p></p>');
  const [answerLu, setAnswerLu] = useState('<p></p>');
  const [scriptureRefs, setScriptureRefs] = useState<ScriptureRef[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  // Topic form state
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [topicNameEn, setTopicNameEn] = useState('');
  const [topicNameLu, setTopicNameLu] = useState('');

  useEffect(() => { fetchAll(); fetchTopics(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bible-qa');
      const data = await res.json();
      setQaList(Array.isArray(data) ? data : []);
    } catch { setMessage('❌ Failed to load Q&A entries'); }
    finally { setLoading(false); }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/bible-qa?type=topics');
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : []);
      if (data.length > 0 && !topic) setTopic(data[0].name_en);
    } catch {}
  };

  const resetForm = () => {
    setTopic(topics[0]?.name_en || '');
    setQuestion(''); setQuestionLu('');
    setAnswer('<p></p>'); setAnswerLu('<p></p>');
    setScriptureRefs([]); setIsPublished(true);
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); setAnswerLang('en'); };

  const openEdit = (qa: QA) => {
    setTopic(qa.topic);
    setQuestion(qa.question); setQuestionLu(qa.question_lu || '');
    setAnswer(qa.answer); setAnswerLu(qa.answer_lu || '<p></p>');
    const refs: ScriptureRef[] = Array.isArray(qa.scripture_refs) ? qa.scripture_refs
      : (typeof qa.scripture_refs === 'string' ? JSON.parse(qa.scripture_refs) : []);
    setScriptureRefs(refs);
    setIsPublished(qa.is_published);
    setEditingId(qa.id);
    setShowForm(true);
    setAnswerLang('en');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) { setMessage('❌ English Question and Answer are required'); return; }
    setSaving(true);
    try {
      const body = { topic, question, question_lu: questionLu, answer, answer_lu: answerLu, scripture_refs: scriptureRefs, is_published: isPublished };
      const res = editingId
        ? await fetch('/api/bible-qa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editingId }) })
        : await fetch('/api/bible-qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed');
      setMessage(editingId ? '✅ Q&A updated!' : '✅ Q&A created!');
      resetForm(); setShowForm(false); fetchAll();
    } catch { setMessage('❌ Failed to save. Please try again.'); }
    finally { setSaving(false); setTimeout(() => setMessage(''), 4000); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this Q&A entry?')) return;
    await fetch(`/api/bible-qa?id=${id}`, { method: 'DELETE' });
    setMessage('✅ Deleted'); fetchAll();
    setTimeout(() => setMessage(''), 3000);
  };

  const togglePublish = async (qa: QA) => {
    const refs: ScriptureRef[] = Array.isArray(qa.scripture_refs) ? qa.scripture_refs
      : (typeof qa.scripture_refs === 'string' ? JSON.parse(qa.scripture_refs) : []);
    await fetch('/api/bible-qa', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qa.id, topic: qa.topic, question: qa.question, question_lu: qa.question_lu, answer: qa.answer, answer_lu: qa.answer_lu, scripture_refs: refs, is_published: !qa.is_published }),
    });
    fetchAll();
  };

  // Topic CRUD
  const saveTopic = async () => {
    if (!topicNameEn.trim()) { setMessage('❌ English name required'); return; }
    const body = { type: 'topic', name_en: topicNameEn, name_lu: topicNameLu, id: editingTopicId };
    await fetch('/api/bible-qa', {
      method: editingTopicId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setMessage('✅ Topic saved!'); setShowTopicForm(false);
    setTopicNameEn(''); setTopicNameLu(''); setEditingTopicId(null);
    fetchTopics(); setTimeout(() => setMessage(''), 3000);
  };

  const deleteTopic = async (id: number) => {
    if (!confirm('Delete this topic? Existing Q&A entries will keep the topic name.')) return;
    await fetch(`/api/bible-qa?type=topic&topicId=${id}`, { method: 'DELETE' });
    setMessage('✅ Topic deleted'); fetchTopics();
    setTimeout(() => setMessage(''), 3000);
  };

  const topicNames = ['All', ...topics.map(t => t.name_en)];
  const filtered = filterTopic === 'All' ? qaList : qaList.filter(q => q.topic === filterTopic);

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNavbar />
      <div className="pt-24 max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Bible Q&amp;A Management</h1>
            <p className="text-stone-500 mt-1">Create bilingual questions with formatted answers and scripture references</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/qa" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-100 transition-colors text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" /> View Frontend
            </a>
            {activeTab === 'questions' && (
              <button onClick={openNew}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" /> New Q&amp;A
              </button>
            )}
            {activeTab === 'topics' && (
              <button onClick={() => { setShowTopicForm(true); setEditingTopicId(null); setTopicNameEn(''); setTopicNameLu(''); }}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" /> New Topic
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-stone-200 rounded-xl p-1 w-fit">
          {[{ key: 'questions', label: '❓ Questions', icon: BookOpen }, { key: 'topics', label: '🏷️ Topics', icon: Tag }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        {/* ===== TOPICS TAB ===== */}
        {activeTab === 'topics' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {showTopicForm && (
              <div className="border-b border-stone-200 p-6 bg-amber-50/30">
                <h3 className="font-bold text-stone-800 mb-4">{editingTopicId ? 'Edit Topic' : 'New Topic'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">Topic Name (English) *</label>
                    <input type="text" value={topicNameEn} onChange={e => setTopicNameEn(e.target.value)}
                      placeholder="e.g. Salvation"
                      className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-stone-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">Topic Name (Luganda)</label>
                    <input type="text" value={topicNameLu} onChange={e => setTopicNameLu(e.target.value)}
                      placeholder="e.g. Okulokoka"
                      className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-stone-800" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveTopic} className="px-6 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Topic
                  </button>
                  <button onClick={() => setShowTopicForm(false)} className="px-5 py-2.5 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-5 py-3 text-stone-500 font-semibold">English Name</th>
                  <th className="text-left px-5 py-3 text-stone-500 font-semibold">Luganda Name</th>
                  <th className="text-right px-5 py-3 text-stone-500 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topics.map(t => (
                  <tr key={t.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-800">{t.name_en}</td>
                    <td className="px-5 py-3.5 text-stone-500">{t.name_lu || <span className="italic text-stone-300">Not set</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingTopicId(t.id); setTopicNameEn(t.name_en); setTopicNameLu(t.name_lu || ''); setShowTopicForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-stone-400 hover:text-amber-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteTopic(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {topics.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-stone-400">No topics yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== QUESTIONS TAB ===== */}
        {activeTab === 'questions' && (
          <>
            {/* Q&A Form */}
            {showForm && (
              <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-6 sm:p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-stone-900">{editingId ? 'Edit Q&A Entry' : 'Create New Q&A Entry'}</h2>
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="text-stone-400 hover:text-stone-700 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Topic *</label>
                    <select value={topic} onChange={e => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 bg-white text-stone-800">
                      {topics.map(t => <option key={t.id} value={t.name_en}>{t.name_en}{t.name_lu ? ` / ${t.name_lu}` : ''}</option>)}
                    </select>
                    <p className="text-xs text-stone-400 mt-1">Manage topics in the "Topics" tab above</p>
                  </div>

                  {/* Language tab selector for Q&A */}
                  <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
                    <button type="button" onClick={() => setAnswerLang('en')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${answerLang === 'en' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
                      🇬🇧 English
                    </button>
                    <button type="button" onClick={() => setAnswerLang('lu')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${answerLang === 'lu' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
                      🇺🇬 Luganda
                    </button>
                  </div>

                  {answerLang === 'en' ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">Question (English) *</label>
                        <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
                          placeholder="e.g. What does it mean to be born again?"
                          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-stone-800" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">Answer (English) * <span className="text-stone-400 font-normal">(HTML supported)</span></label>
                        <RichTextEditor value={answer} onChange={setAnswer} placeholder="<p>Type the English answer here...</p>" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">Ekibuuzo (Luganda)</label>
                        <input type="text" value={questionLu} onChange={e => setQuestionLu(e.target.value)}
                          placeholder="e.g. Okuzaalibwa omunda kutegeeza ki?"
                          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 text-stone-800" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-2">Okuddamu (Luganda) <span className="text-stone-400 font-normal">(HTML supported)</span></label>
                        <RichTextEditor value={answerLu} onChange={setAnswerLu} placeholder="<p>Wandiika okuddamu mu Luganda wano...</p>" />
                      </div>
                    </>
                  )}

                  {/* Scripture References */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Scripture References</label>
                    <ScriptureRefInput refs={scriptureRefs} onChange={setScriptureRefs} />
                  </div>

                  {/* Published toggle */}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setIsPublished(!isPublished)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isPublished ? 'bg-emerald-500' : 'bg-stone-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${isPublished ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm font-medium text-stone-700">{isPublished ? 'Published (visible to users)' : 'Draft (hidden from users)'}</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving}
                      className="flex-1 sm:flex-none px-8 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition-colors">
                      {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {editingId ? 'Update Q&A' : 'Create Q&A'}</>}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                      className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              {topicNames.map(t => (
                <button key={t} onClick={() => setFilterTopic(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${filterTopic === t ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Q&A List */}
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-stone-200 rounded-2xl animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No Q&A entries yet. Click "New Q&amp;A" to create one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(qa => {
                  const refs: ScriptureRef[] = Array.isArray(qa.scripture_refs) ? qa.scripture_refs
                    : (typeof qa.scripture_refs === 'string' ? JSON.parse(qa.scripture_refs) : []);
                  const isOpen = expandedId === qa.id;

                  return (
                    <div key={qa.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-4 px-5 py-4">
                        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">{qa.topic}</span>
                        <button className="flex-1 text-left text-stone-800 font-medium text-sm sm:text-base hover:text-amber-700 transition-colors"
                          onClick={() => setExpandedId(isOpen ? null : qa.id)}>
                          {qa.question}
                          {qa.question_lu && <span className="block text-xs text-stone-400 font-normal mt-0.5">{qa.question_lu}</span>}
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          {qa.question_lu && <span title="Has Luganda" className="text-lg">🇺🇬</span>}
                          <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium ${qa.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                            {qa.is_published ? 'Published' : 'Draft'}
                          </span>
                          <button onClick={() => togglePublish(qa)} title={qa.is_published ? 'Unpublish' : 'Publish'}
                            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                            {qa.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => openEdit(qa)} className="p-1.5 rounded-lg hover:bg-amber-50 text-stone-400 hover:text-amber-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(qa.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => setExpandedId(isOpen ? null : qa.id)} className="p-1.5 text-stone-400">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">🇬🇧 English Answer</p>
                            <div className="text-stone-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml(qa.answer) }} />
                          </div>
                          {qa.answer_lu && (
                            <div>
                              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">🇺🇬 Luganda Answer</p>
                              <div className="text-stone-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml(qa.answer_lu) }} />
                            </div>
                          )}
                          {refs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {refs.map((ref, i) => (
                                <span key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-medium">
                                  <BookOpen className="w-3 h-3" />{ref.ref}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
