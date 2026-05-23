"use client";

import { useState, useEffect } from "react";
import { Calendar, Book, Clock, Plus, Trash2, Edit, Eye, Save, X, Image, User, FileText, Link2 } from "lucide-react";
import RichTextEditor from "../components/RichTextEditor";

interface DevotionalPlan {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
}

interface DevotionalEntry {
  id: number;
  plan_id: number;
  scheduled_date: string;
  title: string;
  devotional_text: string;
  scripture_book: string;
  scripture_chapter: number;
  scripture_verse: number;
  scripture_quotation: string;
  related_scriptures: any[];
  further_readings: string;
  author: string;
  cover_photo_url: string;
  is_published: boolean;
  plan_title?: string;
}

interface RelatedScripture {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface ParsedReference {
  book: string;
  chapter: number;
  verse: number;
  display: string;
  isValid: boolean;
  error?: string;
}

export default function DevotionalEntriesManagement() {
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [entries, setEntries] = useState<DevotionalEntry[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<DevotionalEntry>>({});
  const [relatedScriptures, setRelatedScriptures] = useState<RelatedScripture[]>([]);
  const [bibleBooks, setBibleBooks] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [parsedFurtherReadings, setParsedFurtherReadings] = useState<ParsedReference[]>([]);
  const [selectedVersePopup, setSelectedVersePopup] = useState<{ book: string; chapter: number; verse: number; text: string } | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchBibleBooks();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchEntries(selectedPlanId);
    }
  }, [selectedPlanId]);

  const fetchPlans = async () => {
    const res = await fetch("/api/devotional-plans");
    const data = await res.json();
    setPlans(data);
    if (data.length > 0 && !selectedPlanId) {
      setSelectedPlanId(data[0].id);
    }
  };

  const fetchEntries = async (planId: number) => {
    const res = await fetch(`/api/devotional-entries?planId=${planId}&showAll=true`);
    const data = await res.json();
    setEntries(data);
  };

  const fetchBibleBooks = async () => {
    const res = await fetch("/api/bible-books");
    const data = await res.json();
    setBibleBooks(data);
  };

  const handleCreateNew = () => {
    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    setEditingEntry({
      plan_id: selectedPlanId || undefined,
      scheduled_date: today,
      title: "",
      devotional_text: "",
      scripture_book: "",
      scripture_chapter: 1,
      scripture_verse: 1,
      scripture_quotation: "",
      related_scriptures: [],
      further_readings: "",
      author: "",
      cover_photo_url: "",
      is_published: false,
    });
    setRelatedScriptures([]);
    setParsedFurtherReadings([]);
    setUseManualEntry(false);
    setIsEditing(true);
  };

  const handleEdit = (entry: DevotionalEntry) => {
    setEditingEntry(entry);
    setRelatedScriptures(entry.related_scriptures || []);
    // Determine if manual entry was used based on whether scripture_quotation exists
    setUseManualEntry(!!entry.scripture_quotation && entry.scripture_quotation.trim().length > 0);
    // Parse existing further readings if they exist
    if (entry.further_readings) {
      parseFurtherReadings(entry.further_readings);
    } else {
      setParsedFurtherReadings([]);
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...editingEntry,
        related_scriptures: relatedScriptures,
      };

      const method = editingEntry.id ? "PUT" : "POST";
      const res = await fetch("/api/devotional-entries", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert("Error saving devotional: " + (errorData.error || "Unknown error"));
        return;
      }

      setIsEditing(false);
      setEditingEntry({});
      setRelatedScriptures([]);
      setParsedFurtherReadings([]);
      if (selectedPlanId) fetchEntries(selectedPlanId);
      alert("✅ Devotional saved successfully!");
    } catch (error: any) {
      console.error("Error saving devotional:", error);
      alert("❌ Error saving devotional: " + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this devotional entry?")) return;
    await fetch(`/api/devotional-entries?id=${id}`, { method: "DELETE" });
    if (selectedPlanId) fetchEntries(selectedPlanId);
  };

  const addRelatedScripture = () => {
    setRelatedScriptures([
      ...relatedScriptures,
      { book: "", chapter: 1, verse: 1, text: "" },
    ]);
  };

  const removeRelatedScripture = (index: number) => {
    setRelatedScriptures(relatedScriptures.filter((_, i) => i !== index));
  };

  const updateRelatedScripture = (index: number, field: string, value: any) => {
    const updated = [...relatedScriptures];
    updated[index] = { ...updated[index], [field]: value };
    setRelatedScriptures(updated);
  };

  // Parse further readings textarea into clickable references
  const parseFurtherReadings = (text: string) => {
    if (!text.trim()) {
      setParsedFurtherReadings([]);
      return;
    }

    // Split by semicolon or newline
    const references = text.split(/[;\n]/).map(ref => ref.trim()).filter(ref => ref);
    const parsed: ParsedReference[] = [];

    for (const ref of references) {
      const result = parseScriptureReference(ref);
      parsed.push(result);
    }

    setParsedFurtherReadings(parsed);
  };

  // Parse a single scripture reference
  const parseScriptureReference = (ref: string): ParsedReference => {
    // Pattern: "Book Chapter:Verse" or "Book Chapter:Verse-Verse" or "1 Book Chapter:Verse"
    const pattern = /^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/;
    const match = ref.match(pattern);

    if (!match) {
      return {
        book: "",
        chapter: 0,
        verse: 0,
        display: ref,
        isValid: false,
        error: "Invalid format. Use 'Book Chapter:Verse' (e.g., Romans 1:6)",
      };
    }

    const bookName = match[1].trim();
    const chapter = parseInt(match[2]);
    const verse = parseInt(match[3]);
    const endVerse = match[4] ? parseInt(match[4]) : verse;

    // Check if book exists
    const book = bibleBooks.find(
      (b) =>
        b.name_english.toLowerCase() === bookName.toLowerCase() ||
        b.abbreviation_english?.toLowerCase() === bookName.toLowerCase()
    );

    if (!book) {
      return {
        book: bookName,
        chapter,
        verse,
        display: ref,
        isValid: false,
        error: "Book not found in database",
      };
    }

    // Check if chapter is valid
    if (chapter < 1 || chapter > book.total_chapters) {
      return {
        book: book.name_english,
        chapter,
        verse,
        display: ref,
        isValid: false,
        error: `Chapter ${chapter} exceeds book limit (${book.total_chapters})`,
      };
    }

    return {
      book: book.name_english,
      chapter,
      verse,
      display: endVerse > verse ? `${book.name_english} ${chapter}:${verse}-${endVerse}` : `${book.name_english} ${chapter}:${verse}`,
      isValid: true,
    };
  };

  // Fetch verse text for popup
  const fetchVerseText = async (book: string, chapter: number, verse: number) => {
    try {
      const bookData = bibleBooks.find(b => b.name_english === book);
      if (!bookData) return;

      const res = await fetch(`/api/bible-verses?bookId=${bookData.id}&chapter=${chapter}&verse=${verse}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setSelectedVersePopup({
          book,
          chapter,
          verse,
          text: data[0].text_english || data[0].text_luganda || "Verse text not available",
        });
      }
    } catch (error) {
      console.error("Error fetching verse:", error);
    }
  };

  const handleFurtherReadingsChange = (value: string) => {
    setEditingEntry({ ...editingEntry, further_readings: value });
    parseFurtherReadings(value);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getEntriesForDate = (date: string) => {
    return entries.filter((e) => {
      const entryDate = e.scheduled_date ? e.scheduled_date.split('T')[0] : '';
      return entryDate === date;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = getEntriesForDate(dateStr);
      const isPast = new Date(dateStr) < new Date(new Date().toDateString());
      const _t = new Date();
      const isToday = dateStr === `${_t.getFullYear()}-${String(_t.getMonth() + 1).padStart(2, '0')}-${String(_t.getDate()).padStart(2, '0')}`;

      days.push(
        <div
          key={day}
          className={`p-2 border rounded-lg min-h-[80px] ${
            isToday ? "bg-blue-50 border-blue-500" : "border-gray-200"
          } ${isPast ? "bg-gray-50" : ""}`}
        >
          <div className="font-semibold text-sm mb-1">{day}</div>
          {dayEntries.map((entry) => (
            <div
              key={entry.id}
              className={`text-xs p-1 rounded mb-1 cursor-pointer ${
                entry.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
              onClick={() => handleEdit(entry)}
            >
              {entry.title.substring(0, 15)}...
            </div>
          ))}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Calendar className="text-purple-600" size={36} />
                Manage Scheduled Devotionals
              </h1>
              <p className="text-gray-600 mt-2">Schedule and manage devotional entries for each plan</p>
            </div>
            <button
              onClick={() => window.location.href = "/admin-panel"}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all"
            >
              ← Back to Admin
            </button>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Devotional Plan
          </label>
          <select
            value={selectedPlanId || ""}
            onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Select a Plan --</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        {selectedPlanId && (
          <>
            {/* Month/Year Navigation */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  ← Previous
                </button>
                <div className="text-xl font-bold text-gray-800">
                  {monthNames[selectedMonth]} {selectedYear}
                </div>
                <button
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Calendar View</h2>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Schedule New Devotional
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center font-semibold text-gray-700 p-2">
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>
              <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                  <span>Published</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div>
                  <span>Scheduled (Not Published)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border border-blue-500 rounded"></div>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">All Devotionals (List View)</h2>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          entry.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {entry.is_published ? "Published" : "Scheduled"}
                        </span>
                        <span className="text-sm text-gray-600">{entry.scheduled_date}</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 mt-2">{entry.title}</h3>
                      {entry.scripture_book && (
                        <p className="text-sm text-purple-600">
                          {entry.scripture_book} {entry.scripture_chapter}:{entry.scripture_verse}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Edit/Create Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingEntry.id ? "Edit Devotional Entry" : "Schedule New Devotional"}
                </h2>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingEntry({});
                    setRelatedScriptures([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. Devotional Date */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border-2 border-purple-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="text-purple-600" size={20} />
                    Devotional Date *
                  </label>
                  <input
                    type="date"
                    value={editingEntry.scheduled_date || ""}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, scheduled_date: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* 2. Author */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-xl border-2 border-green-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <User className="text-green-600" size={20} />
                    Devotional Writer/Author
                  </label>
                  <input
                    type="text"
                    value={editingEntry.author || ""}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, author: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Pastor John Smith, Ministry Team, etc."
                  />
                </div>

                {/* 3. Devotional Cover Photo */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border-2 border-orange-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Image className="text-orange-600" size={20} />
                    Devotional Cover Photo (Backblaze Image URL)
                  </label>
                  <input
                    type="url"
                    value={editingEntry.cover_photo_url || ""}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, cover_photo_url: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    placeholder="https://your-backblaze-url.com/image.jpg (leave empty for default)"
                  />
                  {editingEntry.cover_photo_url && (
                    <div className="mt-3">
                      <img
                        src={editingEntry.cover_photo_url}
                        alt="Cover preview"
                        className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Invalid+Image+URL";
                        }}
                      />
                    </div>
                  )}
                  {!editingEntry.cover_photo_url && (
                    <p className="text-xs text-gray-500 mt-2">
                      💡 If no URL is provided, the app will use a default cover image
                    </p>
                  )}
                </div>

                {/* 4. Devotional Title */}
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border-2 border-pink-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="text-pink-600" size={20} />
                    Devotional Title *
                  </label>
                  <input
                    type="text"
                    value={editingEntry.title || ""}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, title: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., Walking in Faith Today"
                    required
                  />
                </div>

                {/* 5. Devotional Bible Reading */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 font-semibold text-gray-800">
                      <Book className="text-blue-600" size={20} />
                      Devotional Bible Reading (Optional)
                    </label>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-gray-300">
                      <label className="text-sm font-medium text-gray-700">Input Method:</label>
                      <button
                        onClick={() => setUseManualEntry(false)}
                        className={`px-3 py-1 text-xs rounded ${!useManualEntry ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Dropdowns
                      </button>
                      <button
                        onClick={() => setUseManualEntry(true)}
                        className={`px-3 py-1 text-xs rounded ${useManualEntry ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Manual Entry
                      </button>
                    </div>
                  </div>

                  {!useManualEntry ? (
                    <>
                      {/* Dropdown Selection Method */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                          <select
                            value={editingEntry.scripture_book || ""}
                            onChange={(e) =>
                              setEditingEntry({ ...editingEntry, scripture_book: e.target.value })
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Book</option>
                            {bibleBooks.map((book) => (
                              <option key={book.id} value={book.name_english}>
                                {book.name_english}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                          <input
                            type="number"
                            value={editingEntry.scripture_chapter || 1}
                            onChange={(e) =>
                              setEditingEntry({
                                ...editingEntry,
                                scripture_chapter: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Verse</label>
                          <input
                            type="number"
                            value={editingEntry.scripture_verse || 1}
                            onChange={(e) =>
                              setEditingEntry({
                                ...editingEntry,
                                scripture_verse: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scripture Quotation
                        </label>
                        <RichTextEditor value={editingEntry.scripture_quotation || ""} onChange={(v) => setEditingEntry({ ...editingEntry, scripture_quotation: v })} placeholder="Enter the verse text..." minHeight="80px" />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Manual Text Entry Method */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complete Scripture Reference
                        </label>
                        <input
                          type="text"
                          value={editingEntry.scripture_quotation || ""}
                          onChange={(e) =>
                            setEditingEntry({ ...editingEntry, scripture_quotation: e.target.value })
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Genesis 12:1-4 or Genesis 12:1-2;3,6 or Psalms 23:1-6"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter complete scripture references like "Genesis 12:1-4" or multiple verses like "John 3:16-17;20"
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Verse Text
                        </label>
                        <RichTextEditor value={editingEntry.scripture_book || ""} onChange={(v) => setEditingEntry({ ...editingEntry, scripture_book: v })} placeholder="Paste or type the full verse text here..." minHeight="100px" />
                      </div>
                    </>
                  )}
                </div>

                {/* 6. Devotional Content - English */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border-2 border-yellow-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="text-yellow-600" size={20} />
                    Devotional Content (English) *
                  </label>
                  <RichTextEditor value={editingEntry.devotional_text || ""} onChange={(v) => setEditingEntry({ ...editingEntry, devotional_text: v })} placeholder="Paste or write your devotional content here (English)..." minHeight="200px" />
                </div>

                {/* 6b. Devotional Content - Luganda */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border-2 border-orange-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FileText className="text-orange-600" size={20} />
                    Devotional Content (Luganda) - Optional
                  </label>
                  <RichTextEditor value={(editingEntry as any).devotional_text_lu || ""} onChange={(v) => setEditingEntry({ ...editingEntry, devotional_text_lu: v })} placeholder="Paste or write your devotional content here (Luganda)..." minHeight="200px" />
                </div>

                {/* 7. Further Bible Readings */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-xl border-2 border-teal-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Link2 className="text-teal-600" size={20} />
                    Further Bible Readings (Optional)
                  </label>
                  <RichTextEditor value={editingEntry.further_readings || ""} onChange={handleFurtherReadingsChange} placeholder="Paste scripture references here (e.g., Romans 1:6; 1 Corinthians 1:2; John 17:11-12)" minHeight="100px" />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Paste references separated by semicolons or new lines. They will become clickable links showing verse text.
                  </p>

                  {/* Parsed Further Readings Preview */}
                  {parsedFurtherReadings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Parsed References ({parsedFurtherReadings.filter(r => r.isValid).length} valid)
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {parsedFurtherReadings.map((ref, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 ${
                              ref.isValid
                                ? "bg-green-50 border-green-300 cursor-pointer hover:bg-green-100"
                                : "bg-red-50 border-red-300"
                            }`}
                            onClick={() => {
                              if (ref.isValid) {
                                fetchVerseText(ref.book, ref.chapter, ref.verse);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className={`font-medium ${ref.isValid ? "text-green-800" : "text-red-800"}`}>
                                  {ref.isValid ? "✅" : "❌"} {ref.display}
                                </span>
                                {!ref.isValid && ref.error && (
                                  <p className="text-xs text-red-600 mt-1">{ref.error}</p>
                                )}
                                {ref.isValid && (
                                  <p className="text-xs text-green-600 mt-1">Click to preview verse text</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Related Scriptures - Hidden */}
                {false && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">🔗 Related Scriptures</h3>
                    <button
                      onClick={addRelatedScripture}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Scripture
                    </button>
                  </div>
                  {relatedScriptures.map((scripture, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg mb-3 border border-green-200">
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <select
                          value={scripture.book}
                          onChange={(e) =>
                            updateRelatedScripture(index, "book", e.target.value)
                          }
                          className="p-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Select Book</option>
                          {bibleBooks.map((book) => (
                            <option key={book.id} value={book.name_english}>
                              {book.name_english}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={scripture.chapter}
                          onChange={(e) =>
                            updateRelatedScripture(index, "chapter", parseInt(e.target.value))
                          }
                          placeholder="Ch"
                          className="p-2 border border-gray-300 rounded-lg text-sm"
                          min="1"
                        />
                        <input
                          type="number"
                          value={scripture.verse}
                          onChange={(e) =>
                            updateRelatedScripture(index, "verse", parseInt(e.target.value))
                          }
                          placeholder="Vs"
                          className="p-2 border border-gray-300 rounded-lg text-sm"
                          min="1"
                        />
                        <button
                          onClick={() => removeRelatedScripture(index)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <textarea
                        value={scripture.text}
                        onChange={(e) =>
                          updateRelatedScripture(index, "text", e.target.value)
                        }
                        placeholder="Verse text..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                )}

                {/* Publish Toggle */}
                <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEntry.is_published || false}
                      onChange={(e) =>
                        setEditingEntry({ ...editingEntry, is_published: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-800">
                        ✅ Publish this devotional immediately
                      </span>
                      <p className="text-xs text-gray-600">
                        If unchecked, it will be scheduled but not visible until published
                      </p>
                    </div>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save size={20} />
                    {editingEntry.id ? "Update Devotional" : "Save Devotional"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingEntry({});
                      setRelatedScriptures([]);
                      setParsedFurtherReadings([]);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verse Popup Modal */}
        {selectedVersePopup && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVersePopup(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedVersePopup.book} {selectedVersePopup.chapter}:{selectedVersePopup.verse}
                </h3>
                <button
                  onClick={() => setSelectedVersePopup(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600">
                <p className="text-gray-800 leading-relaxed">{selectedVersePopup.text}</p>
              </div>
              <button
                onClick={() => setSelectedVersePopup(null)}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
