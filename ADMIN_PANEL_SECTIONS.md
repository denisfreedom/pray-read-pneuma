# Bible Admin Panel - 12 Verse Sections Documentation

## Complete Data Flow, Database Mappings & API Endpoints

---

## SECTION 1: PRAYER PASSAGE (Verse Prayer)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_prayers`
  - Columns: id, book_id, chapter, verse_number, english_prayer, luganda_prayer, created_at, updated_at
- **API Endpoint**: `/api/verse-prayers`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, english_prayer, luganda_prayer }`
- **Button**: ✅ Save Prayer Passage
- **Color**: Green (#16a34a)
- **Priority**: HIGHEST - Individual verse prayers

---

## SECTION 2: VERSE NOTES (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_notes`
  - Columns: id, book_id, chapter, verse_number, english_note, luganda_note, created_at, updated_at
- **API Endpoint**: `/api/verse-notes`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishNote, lugandaNote }`
- **Button**: ✅ Save Verse Notes
- **Color**: Purple (#9333ea)

---

## SECTION 3: THEMATIC TAGS (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_themes`
  - Columns: id, book_id, chapter, verse_number, english_theme, luganda_theme, created_at, updated_at
- **API Endpoint**: `/api/verse-themes`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishTheme, lugandaTheme }`
- **Button**: ✅ Save Thematic Tags
- **Color**: Orange (#ea580c)
- **Format**: Comma-separated (e.g., "faith, hope, love")

---

## SECTION 4: HISTORICAL CONTEXT (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_historical_context`
  - Columns: id, book_id, chapter, verse_number, english_context, luganda_context, created_at, updated_at
- **API Endpoint**: `/api/verse-historical-context`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishContext, lugandaContext }`
- **Button**: ✅ Save Historical Context
- **Color**: Red (#dc2626)

---

## SECTION 5: THEOLOGICAL INSIGHTS (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_theological_insights`
  - Columns: id, book_id, chapter, verse_number, english_insight, luganda_insight, created_at, updated_at
- **API Endpoint**: `/api/verse-theological-insights`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishInsight, lugandaInsight }`
- **Button**: ✅ Save Theological Insights
- **Color**: Indigo (#4f46e5)

---

## SECTION 6: DEVOTIONAL INSIGHTS (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_devotional_insights`
  - Columns: id, book_id, chapter, verse_number, english_devotional, luganda_devotional, created_at, updated_at
- **API Endpoint**: `/api/verse-devotional-insights`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishDevotional, lugandaDevotional }`
- **Button**: ✅ Save Devotional Insights
- **Color**: Rose (#e11d48)

---

## SECTION 7: STUDY QUESTIONS (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_study_questions`
  - Columns: id, book_id, chapter, verse_number, english_questions, luganda_questions, created_at, updated_at
- **API Endpoint**: `/api/verse-study-questions`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishQuestions, lugandaQuestions }`
- **Button**: ✅ Save Study Questions
- **Color**: Cyan (#0891b2)
- **Format**: One question per line

---

## SECTION 8: RELATED PASSAGES (NEW)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_related_passages`
  - Columns: id, book_id, chapter, verse_number, english_passages, luganda_passages, created_at, updated_at
- **API Endpoint**: `/api/verse-related-passages`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, englishPassages, lugandaPassages }`
- **Button**: ✅ Save Related Passages
- **Color**: Lime (#84cc16)
- **Format**: "Genesis 1:1, Psalm 23:1, Matthew 5:1"

---

## SECTION 9: COMMENTARY (EXISTING)
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_commentaries`
  - Columns: id, book_id, chapter, verse_number, commentary_text, luganda_commentary_text, created_at, updated_at
- **API Endpoint**: `/api/commentaries`
  - GET: `?bookId=X&chapter=Y&verseNumber=Z`
  - POST: `{ bookId, chapter, verseNumber, commentaryText, lugandaCommentaryText }`
- **Button**: ✅ Save Commentary
- **Color**: Amber (#d97706)

---

## SECTION 10: CROSS REFERENCES (DISPLAY ONLY)
- **Status**: ⚠️ READ-ONLY (Display existing references)
- **Display Condition**: Book + chapter + verse selected
- **Database Table**: `verse_cross_references`
  - Columns: id, source_book_id, source_chapter, source_verse, target_book_id, target_chapter, target_verse, relationship_type, notes, created_at
- **API Endpoint**: `/api/cross-references`
  - GET: `?bookId=X&chapter=Y&verse=Z` (returns array of references)
  - POST: Create via API only (complex relational data)
- **Color**: Fuchsia (#d946ef)
- **Note**: Manage via API for complex relationships

---

## SECTION 11: CHAPTER PRAYER
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book + chapter selected (NO verse)
- **Database Table**: `chapter_prayers`
  - Columns: id, book_id, chapter, en_prayer, lu_prayer, chapter_closing_prayer_audio_url, created_at, updated_at
- **API Endpoint**: `/api/bible-content?type=chapter_prayer&book=NAME&chapter=X`
  - GET: Fetch chapter prayer
  - POST: Save with english_content, luganda_content, audio_url
- **Button**: ✅ Save Chapter Prayer
- **Color**: Pink (#ec4899)
- **Audio**: Embedded player for chapter_closing_prayer_audio_url

---

## SECTION 12: BOOK CLOSING PRAYER
- **Status**: ✅ FULLY OPERATIONAL
- **Display Condition**: Book selected only (NO chapter, NO verse)
- **Database Table**: `book_prayers`
  - Columns: id, book_id, en_prayer, lu_prayer, closing_prayer_audio_url, created_at, updated_at
- **API Endpoint**: `/api/bible-content?type=book_prayer&book=NAME`
  - GET: Fetch book prayer
  - POST: Save with english_content, luganda_content, audio_url
- **Button**: ✅ Save Book Closing Prayer
- **Color**: Teal (#14b8a6)
- **Audio**: Embedded player for closing_prayer_audio_url

---

## Display Hierarchy

```
Book Selection
  ├── Book Closing Prayer (if book only)
  │
  ├── + Chapter Selection
  │   ├── Chapter Prayer (if book + chapter, no verse)
  │   │
  │   └── + Verse Selection
  │       ├── Edit Verse (text content)
  │       ├── Prayer Passage ⭐
  │       ├── Verse Notes
  │       ├── Thematic Tags
  │       ├── Historical Context
  │       ├── Theological Insights
  │       ├── Devotional Insights
  │       ├── Study Questions
  │       ├── Related Passages
  │       ├── Commentary
  │       └── Cross References
```

---

## Key Features

✨ **Bilingual Support**
- All 12 sections support English and Luganda
- Separate input fields per language
- Independent data persistence

📱 **Responsive Design**
- Full-width sections with visual hierarchy
- Color-coded borders for identification
- Consistent button styling

🔄 **Real-Time Sync**
- Auto-reload after successful saves
- Immediate success/error feedback
- Loading states prevent duplicate submissions

🛡️ **Data Validation**
- Required field validation
- API response validation
- Error message feedback

🎨 **User Experience**
- RichTextEditor for formatted text
- Audio player preview for audio URLs
- Clear section headers with icons

---

## How to Use

1. **Select Book** → See "Book Closing Prayer"
2. **Select Book + Chapter** → See "Chapter Prayer"  
3. **Select Book + Chapter + Verse** → See all 10 verse-level sections

Each section has:
- English text input
- Luganda text input
- Save button with loading state
- Auto-reload after successful save
- Success/error messages

---

## Database Status

All tables created and verified:
- ✅ verse_prayers (existing)
- ✅ verse_notes (new)
- ✅ verse_themes (new)
- ✅ verse_historical_context (new)
- ✅ verse_theological_insights (new)
- ✅ verse_devotional_insights (new)
- ✅ verse_study_questions (new)
- ✅ verse_related_passages (new)
- ✅ verse_commentaries (existing)
- ✅ verse_cross_references (existing)
- ✅ chapter_prayers (existing)
- ✅ book_prayers (existing)

All API endpoints created and functional.
