# Activity Logging System Documentation

## Overview

The Pray-Read Bible app now includes a comprehensive activity logging system that tracks all user interactions and displays them in a live-updating activity feed on the user dashboard.

## Database Tables

### 1. `verse_view_log`
Tracks when users view verses in the Bible reader.
```sql
- id: SERIAL PRIMARY KEY
- user_email: TEXT
- book_id: INTEGER
- chapter: INTEGER
- verse_number: INTEGER
- action: VARCHAR(50) DEFAULT 'view'
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 2. `book_visit_log`
Tracks when users visit a Bible book and chapter.
```sql
- id: SERIAL PRIMARY KEY
- user_email: TEXT
- book_id: INTEGER
- chapter: INTEGER
- visited_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 3. `prayer_activity_log`
Tracks when users view or expand prayers for verses.
```sql
- id: SERIAL PRIMARY KEY
- user_email: TEXT
- book_id: INTEGER
- chapter: INTEGER
- verse_number: INTEGER
- action: VARCHAR(50) DEFAULT 'view' (values: 'view', 'expand', 'save', 'share')
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 4. `devotional_access_log`
Tracks when users access devotional plan entries.
```sql
- id: SERIAL PRIMARY KEY
- user_email: TEXT
- plan_id: INTEGER
- day_number: INTEGER
- action: VARCHAR(50) DEFAULT 'view'
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 5. `verse_bookmarks` (existing)
Already existed - tracks saved verses. Now integrated into activity feed.

## API Routes

### `/api/activity-log` (POST)
**Purpose**: Log any type of user activity

**Request Body**:
```json
{
  "user_email": "user@example.com",
  "activity_type": "verse_view|prayer_view|prayer_expanded|book_visit|devotional_access|bookmark",
  "book_id": 2,
  "chapter": 1,
  "verse_number": 1,
  "plan_id": 5,
  "day_number": 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Activity logged: verse_view",
  "activityId": 123,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### `/api/activity-log` (GET)
**Purpose**: Retrieve combined activity feed for a user

**Query Parameters**:
- `userEmail` (required): User email
- `limit` (optional, default: 50): Number of records to return

**Response**:
```json
{
  "success": true,
  "activityCount": 45,
  "activities": [
    {
      "activity_type": "bookmark",
      "book_name": "Genesis",
      "book_number": 1,
      "chapter": 1,
      "verse_number": 1,
      "created_at": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

### `/api/prayer-activity` (POST)
**Legacy endpoint** - Still works but `/api/activity-log` is preferred for new implementations

## Frontend Components

### ActivityFeed Component
**Location**: `/app/components/ActivityFeed.tsx`

**Props**:
```typescript
interface ActivityFeedProps {
  userEmail: string;           // User email (required)
  limit?: number;              // Max activities to display (default: 50)
  autoRefresh?: boolean;       // Auto-refresh feed (default: true)
  refreshInterval?: number;    // Refresh interval in ms (default: 10000)
}
```

**Features**:
- Displays all activity types with appropriate icons
- Auto-refreshes every 15 seconds (configurable)
- Shows relative time ("2h ago", "just now", etc.)
- Clickable activities link to relevant verses
- Scrollable container with max height
- Manual refresh button

**Usage Example**:
```typescript
<ActivityFeed 
  userEmail={user.email}
  limit={50}
  autoRefresh={true}
  refreshInterval={15000}
/>
```

## Activity Types & Icons

| Activity Type | Icon | Color | Description |
|---|---|---|---|
| `verse_view` | 👁️ Eye | Blue | User viewed a verse |
| `prayer_view` | ❤️ Heart | Purple | User viewed a prayer |
| `prayer_expanded` | ❤️ Heart | Purple | User expanded a prayer section |
| `bookmark` | 🔖 Bookmark | Pink | User saved a verse |
| `book_visit` | 📖 Book | Cyan | User visited a book/chapter |
| `devotional_access` | 🔥 Flame | Orange | User accessed a devotional |

## Integration Points

### 1. Bible Reader (`/app/bible-reader/[book]/[chapter]/page.tsx`)
- **Book Visit**: Logged when user navigates to a chapter
- **Prayer Expansion**: Logged when user expands prayer section (via VersePrayerDisplay)

### 2. VersePrayerDisplay Component
- **Prayer Expanded**: Logged when user clicks heart icon to expand prayers

### 3. Dashboard (`/app/dashboard/page.tsx`)
- **ActivityFeed Display**: Shows consolidated activity feed with all activity types
- **Dashboard Images**: Visual overview of tracking system

### 4. Bookmarks (existing)
- **Verse Bookmarks**: Already tracked in `verse_bookmarks` table, now displayed in activity feed

## Data Flow Diagram

```
┌─────────────────┐
│   Bible Reader  │
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │ User Interactions:   │
    │ • View verse         │
    │ • Expand prayer      │
    │ • Visit book         │
    │ • Bookmark verse     │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  /api/activity-log (POST)      │
    │  Unified logging endpoint      │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────────────────────┐
    │  Database Activity Tables:                     │
    │  • verse_view_log                             │
    │  • prayer_activity_log                        │
    │  • book_visit_log                             │
    │  • devotional_access_log                      │
    │  • verse_bookmarks (existing)                 │
    └────┬──────────────────────────────────────────┘
         │
    ┌────▼─────────────────────┐
    │ /api/activity-log (GET)  │
    │ Fetch merged feed        │
    └────┬─────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  ActivityFeed Component   │
    │  Dashboard Display        │
    └───────────────────────────┘
```

## Usage Examples

### Logging Verse Views
```typescript
await fetch('/api/activity-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'user@example.com',
    activity_type: 'verse_view',
    book_id: 2,
    chapter: 1,
    verse_number: 1
  })
});
```

### Logging Prayer Expansion
```typescript
await fetch('/api/activity-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'user@example.com',
    activity_type: 'prayer_expanded',
    book_id: 2,
    chapter: 1,
    verse_number: 1
  })
});
```

### Logging Book Visits
```typescript
await fetch('/api/activity-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'user@example.com',
    activity_type: 'book_visit',
    book_id: 2,
    chapter: 1
  })
});
```

### Logging Devotional Access
```typescript
await fetch('/api/activity-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'user@example.com',
    activity_type: 'devotional_access',
    plan_id: 1,
    day_number: 5
  })
});
```

### Fetching User Activity Feed
```typescript
const response = await fetch(
  `/api/activity-log?userEmail=${encodeURIComponent(userEmail)}&limit=50`,
  { cache: 'no-store' }
);
const data = await response.json();
console.log(data.activities); // Array of activities sorted by date
```

## Privacy & Security

- **Only authenticated users**: Activity is only logged when user email is available
- **Per-user data**: Each user can only see their own activity
- **Database isolation**: Separate tables keep data organized and queryable
- **Optional tracking**: Non-authenticated users can still use the app without logging

## Performance Considerations

1. **Activity Feed Limits**: Default limit of 50 items prevents huge queries
2. **Auto-refresh**: Configurable interval (default 15s) prevents excessive polling
3. **Indexes**: Consider adding indexes on frequent query columns:
   ```sql
   CREATE INDEX idx_verse_view_email ON verse_view_log(user_email, created_at DESC);
   CREATE INDEX idx_prayer_activity_email ON prayer_activity_log(user_email, created_at DESC);
   CREATE INDEX idx_book_visit_email ON book_visit_log(user_email, visited_at DESC);
   ```

## Future Enhancements

1. **Advanced Filtering**: Filter by activity type, date range, book
2. **Statistics Dashboard**: Show user's reading streak, most-read books
3. **Export Data**: Download activity history as CSV/PDF
4. **Notifications**: Alert user of community activity
5. **Recommendations**: Suggest content based on reading history
6. **Analytics**: Admin panel showing app-wide usage statistics

## Troubleshooting

### Activity not appearing in feed
1. Check user is logged in: `/api/auth/session`
2. Verify user_email is being passed correctly
3. Check database tables exist: All 4 tables should be present
4. Review browser console for fetch errors

### Auto-refresh not working
1. Check network tab - API calls should occur every 15s
2. Verify CORS is configured correctly
3. Check for JavaScript errors in console

### Old activity not showing
1. Default limit is 50 - increase `limit` prop if needed
2. Activities from guests (no email) won't appear
3. Check database has data: `SELECT COUNT(*) FROM prayer_activity_log`

## Additional Resources

- **Dashboard**: `/dashboard` - View your activity feed
- **Bible Reader**: `/bible-reader/[book]/[chapter]` - Automatic logging
- **Settings**: Manage notification preferences (future feature)
