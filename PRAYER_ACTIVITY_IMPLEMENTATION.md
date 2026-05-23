# Prayer Display & Activity Logging Implementation

## Feature Overview
This implementation adds a complete verse-to-prayer hierarchy with activity logging integration, allowing users to view prayers as expandable child elements of Bible verses and tracking prayer viewing activity in the user dashboard.

---

## 1. Database Structure

### New Table Created
```sql
CREATE TABLE prayer_activity_log (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  action VARCHAR(50) DEFAULT 'view',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES bible_books(id)
);
```

### Table Relationships
```
bible_books (id, name_english, total_chapters)
    ↓
bible_verses (id, book_id, chapter, verse, text_english, text_luganda)
    ↓
verse_prayers (id, book_id, chapter, verse_number, english_prayer, luganda_prayer)
    ↓
prayer_activity_log (id, user_email, book_id, chapter, verse_number, action, created_at)
```

---

## 2. API Routes

### /api/prayer-activity (NEW)
**Purpose:** Log when users view or interact with prayers

**POST Request:**
```json
{
  "user_email": "user@example.com",
  "book_id": 1,
  "chapter": 1,
  "verse_number": 1,
  "action": "view"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prayer view logged successfully",
  "activityId": 123
}
```

### /api/verse-prayers (UPDATED)
Now supports:
- **GET** with `bookId`, `chapter`, `verseNumber` parameters
- **POST** UPSERT (no duplicates created on re-upload)

### /api/user-activity (UPDATED)
Now returns UNION of:
- Bookmark activity (from `verse_bookmarks` table)
- Prayer activity (from `prayer_activity_log` table)
- Combined and sorted by `created_at DESC`

---

## 3. Frontend Components

### VersePrayerDisplay.tsx (NEW)
Location: `/app/components/VersePrayerDisplay.tsx`

**Features:**
- Renders as expandable button below each verse
- Shows heart icon (❤️) that toggles expansion
- Displays prayers in selected language(s):
  - English only
  - Luganda only
  - Both languages (bilingual)
- Automatically logs prayer view when expanded
- Respects user authentication (only logs if `userEmail` provided)

**Props:**
```typescript
interface VersePrayerDisplayProps {
  bookId: number;
  chapter: number;
  verseNumber: number;
  prayer: Prayer | null;
  language: 'english' | 'luganda' | 'both';
  userEmail?: string;
}
```

**Usage:**
```tsx
<VersePrayerDisplay
  bookId={book.id}
  chapter={chapterNum}
  verseNumber={verse.verse}
  prayer={prayers[verse.verse] || null}
  language={language}
  userEmail={userEmail}
/>
```

### Bible Reader Page (UPDATED)
Location: `/app/bible-reader/[book]/[chapter]/page.tsx`

**Changes:**
- Fetches user session to get email for activity logging
- Imports and uses `VersePrayerDisplay` component
- Removed old prayer tab button (replaced by component)
- Prayer now displays as child element of verse hierarchy

**Verse Component Structure:**
```
<Verse>
  ├─ Verse number & text
  ├─ Copy button
  ├─ [NEW] VersePrayerDisplay (expandable prayer)
  └─ Tabs (Commentary, Cross-Ref, Notes)
</Verse>
```

### Dashboard Page (UPDATED)
Location: `/app/dashboard/page.tsx`

**Changes:**
- Updated "Recent Activity" section to display both bookmarks and prayer views
- Added icon differentiation:
  - 📌 Bookmark activity (Clock icon, yellow)
  - ❤️ Prayer view activity (Heart icon, purple)
- Shows activity type: "Bookmarked ..." vs "Viewed prayer for ..."
- Combined activity history sorted by timestamp

---

## 4. Data Flow Diagram

### Complete Prayer-to-Dashboard Flow

```
┌─────────────────┐
│  Admin Panel    │  Edit prayers via /admin-panel/page.tsx
└────────┬────────┘
         │
         ▼
   ┌──────────────────────┐
   │ POST /api/verse-prayers │  Save prayer (UPSERT)
   └────────┬─────────────┘
            │
            ▼
       ┌─────────────────┐
       │  verse_prayers  │  (book_id, chapter, verse_number, english_prayer, luganda_prayer)
       └────────┬────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │  Bible Reader Page           │  /bible-reader/[book]/[chapter]
    │  - Fetches verse_prayers     │
    │  - Gets user email session   │
    └────────┬─────────────────────┘
             │
             ▼
     ┌──────────────────────────┐
     │  VersePrayerDisplay      │  Expandable component below each verse
     │  - Shows prayer in chosen │
     │  - Logs on expand        │  language(s)
     └────────┬─────────────────┘
              │
              ▼ [User clicks to expand]
    ┌──────────────────────────────────┐
    │  POST /api/prayer-activity       │  Log: user_email, book_id, chapter, verse_number, action='view'
    └────────┬─────────────────────────┘
             │
             ▼
       ┌──────────────────────┐
       │ prayer_activity_log  │  (user_email, book_id, chapter, verse_number, created_at)
       └────────┬─────────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │  GET /api/user-activity      │  Fetches UNION of:
    │  ?userEmail=...              │  1. verse_bookmarks
    │                              │  2. prayer_activity_log
    │  Returns combined activity   │  (sorted by created_at DESC)
    │  history with activity_type  │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  User Dashboard          │  /app/dashboard/page.tsx
    │  Recent Activity Section │  Shows:
    │                          │  - 📌 Bookmarks
    │  - Activity Icon         │  - ❤️ Prayer views
    │  - Action text           │  (last 15 combined)
    │  - Verse reference       │
    │  - Timestamp             │
    │  - Link to verse         │
    └──────────────────────────┘
```

---

## 5. User Experience Flow

### For Bible Readers
1. User navigates to `/bible-reader/Genesis/1`
2. Each verse displays with content
3. **Below each verse**: Prayer button (❤️ Prayer for this Verse)
4. User clicks to expand
5. Prayer displays in their chosen language (EN / LU / Both)
6. **Activity logged automatically** (if logged in)
7. Expand/collapse is smooth with fade-in animation

### For Dashboard Analytics
1. User visits `/dashboard`
2. Scrolls to "Recent Activity" section
3. Sees combined history of bookmarks and prayer views
4. Each entry shows:
   - Action type icon (📌 or ❤️)
   - Action text: "Bookmarked..." or "Viewed prayer for..."
   - Verse reference: "Genesis 1:1"
   - Timestamp: "Jan 15, 10:30 AM"
   - Link to that verse in Bible reader

---

## 6. Key Features

✅ **Prayer as Child Element**
- Prayers are nested under verses (visual hierarchy)
- No longer in a separate tab
- Always visible for expansion

✅ **Bilingual Support**
- Users can view prayers in English only
- Luganda only
- Both languages side-by-side
- Respects language selection from Bible reader

✅ **Activity Tracking**
- Only logs when users actually view prayers
- Only for authenticated users
- Includes user email, location (book/chapter/verse), action type, timestamp
- Separate from bookmarks (maintains data clarity)

✅ **Dashboard Integration**
- Prayer views mixed with bookmarks in timeline
- Easy visual differentiation (different icons)
- Shows most recent activities
- Clicking activity links to that verse

✅ **No Duplicates**
- Prayer API uses UPSERT logic
- Admin can re-upload same prayers without creating duplicates
- Updates existing records on re-import

✅ **Performance Optimized**
- Prayer_activity_log only created on user interaction
- No logging for anonymous users
- Activity fetched via efficient SQL UNION query
- Activity history cached per session

---

## 7. Admin Panel Documentation

The admin panel at `/admin-panel` includes:

**Prayer Editing Sections:**
- Individual Verse Prayers (below each verse)
- Chapter Prayers (chapter closing prayers)
- Book Prayers (book closing prayers)

**All sections support:**
- Rich text editor (Word paste compatible)
- Bilingual input (English & Luganda)
- Audio URL attachment
- UPSERT save (no duplicates)

**New Data Flow Documentation:**
- Visual diagram in admin panel
- Shows verse-to-prayer hierarchy
- Explains activity logging flow
- Lists all connected database tables

---

## 8. Testing Checklist

- [ ] Navigate to Bible reader verse
- [ ] See prayer button below verse
- [ ] Click prayer button to expand
- [ ] Verify prayer displays in correct language
- [ ] Check activity logged in dashboard (for authenticated user)
- [ ] Switch between single language and bilingual
- [ ] Verify activity icon (❤️) appears in dashboard
- [ ] Click activity item to navigate back to verse
- [ ] Check multiple prayer views show correct timestamps
- [ ] Verify no duplicate activities logged

---

## 9. API Response Examples

### Prayer Activity Logged
**Request:**
```bash
POST /api/prayer-activity
Content-Type: application/json

{
  "user_email": "john@example.com",
  "book_id": 19,
  "chapter": 23,
  "verse_number": 1,
  "action": "view"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prayer view logged successfully",
  "activityId": 567
}
```

### User Activity Retrieved
**Request:**
```bash
GET /api/user-activity?userEmail=john@example.com
```

**Response:**
```json
{
  "success": true,
  "bookmarkCount": 42,
  "activityHistory": [
    {
      "activity_type": "prayer",
      "book_name": "Psalms",
      "book_number": 19,
      "chapter": 23,
      "verse_number": 1,
      "created_at": "2025-01-16T14:30:00Z"
    },
    {
      "activity_type": "bookmark",
      "book_name": "Genesis",
      "book_number": 1,
      "chapter": 1,
      "verse_number": 1,
      "created_at": "2025-01-16T14:28:00Z"
    }
  ]
}
```

---

## 10. Future Enhancements

Potential additions:
- Prayer audio playback (add audio_url to verse_prayers)
- Prayer favorites (star/like prayers)
- Prayer statistics (most viewed prayers)
- Share prayers with community
- Prayer recommendations based on verse themes
- Export prayer history

---

## File Manifest

### Created Files
- `/app/api/prayer-activity/route.ts` - Prayer activity logging endpoint
- `/app/components/VersePrayerDisplay.tsx` - Prayer display component

### Updated Files
- `/app/bible-reader/[book]/[chapter]/page.tsx` - Added prayer component integration
- `/app/api/user-activity/route.ts` - Added prayer activity to activity history
- `/app/dashboard/page.tsx` - Updated recent activity display

### Database Changes
- Created `prayer_activity_log` table

---

## Summary

This implementation transforms prayers from secondary content into first-class elements of verse study, creating a verse → prayer → activity logging → dashboard pipeline. Users now see prayers prominently, can track their spiritual engagement through activity logs, and admins can monitor prayer interaction patterns through dashboard analytics.
