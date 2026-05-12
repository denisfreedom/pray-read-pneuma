# Activity Logging System - Quick Start Guide

## 🎯 What You Get

A **real-time activity tracking system** that automatically logs everything your users do in the Bible app and displays it in a beautiful, live-updating feed on the dashboard.

---

## 🔥 Automatic Features (No Extra Setup Needed)

### ✅ Logged Automatically

| Action | Where | What Gets Logged |
|--------|-------|-----------------|
| Opens Bible chapter | Bible Reader | Book visit (book, chapter, timestamp) |
| Expands prayer | Prayer Section | Prayer expanded (verse, timestamp) |
| Bookmarks verse | Bible Reader | Bookmark (verse reference, timestamp) |

### ✅ Displayed Automatically

- **Dashboard Activity Feed** - All activities shown in real-time
- **Auto-Refresh** - Updates every 15 seconds automatically
- **Live Links** - Click any activity to jump to that verse
- **Icons & Colors** - Each activity type has unique visual identifier

---

## 📍 Where to See It

### Dashboard
Go to `/dashboard` after logging in

You'll see:
1. **Live Activity Feed** - Shows all recent activities
2. **Activity Icons** - Color-coded by type (bookmark=pink, prayer=purple, etc.)
3. **Timestamps** - "2h ago", "just now", etc.
4. **Quick Jump** - Click activity to go to that verse
5. **Auto-Refresh** - Feed updates every 15 seconds

---

## 🗄️ Database Structure

### 5 Tables Storing Activities

```
verse_view_log
├─ user_email
├─ book_id
├─ chapter
├─ verse_number
├─ action
└─ created_at

prayer_activity_log
├─ user_email
├─ book_id
├─ chapter
├─ verse_number
├─ action (view/expand/save/share)
└─ created_at

book_visit_log
├─ user_email
├─ book_id
├─ chapter
└─ visited_at

devotional_access_log
├─ user_email
├─ plan_id
├─ day_number
├─ action
└─ created_at

verse_bookmarks (existing)
├─ user_email
├─ book_id
├─ chapter
├─ verse_number
└─ created_at
```

---

## 🔌 API Usage

### Log an Activity
```typescript
// POST /api/activity-log
fetch('/api/activity-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_email: 'user@example.com',
    activity_type: 'prayer_expanded', // or: verse_view, book_visit, bookmark, devotional_access
    book_id: 2,
    chapter: 1,
    verse_number: 1
  })
});
```

### Get User's Activity Feed
```typescript
// GET /api/activity-log?userEmail=user@example.com&limit=50
const response = await fetch('/api/activity-log?userEmail=user@example.com&limit=50');
const data = await response.json();
// Returns array of activities sorted by date (newest first)
```

---

## 🎨 Using ActivityFeed Component

### In Your Dashboard
```tsx
import ActivityFeed from '@/app/components/ActivityFeed';

// Inside your dashboard component
<ActivityFeed 
  userEmail={user.email}
  limit={50}
  autoRefresh={true}
  refreshInterval={15000}
/>
```

### Props Explained
- `userEmail` - User's email (required)
- `limit` - Max activities to show (default: 50)
- `autoRefresh` - Auto-refresh enabled? (default: true)
- `refreshInterval` - Refresh every X milliseconds (default: 15000)

---

## 🎨 Activity Types & Visuals

### Visual Reference

```
👁️  Blue      → verse_view       (viewed a verse)
❤️  Purple    → prayer_expanded  (expanded prayer)
🔖 Pink      → bookmark         (saved verse)
📖 Cyan      → book_visit       (visited chapter)
🔥 Orange    → devotional_access (accessed devotional)
⏱️  Grey      → prayer_view      (viewed prayer - legacy)
```

---

## 🔐 Privacy

✅ **Only authenticated users are tracked**
- Guests can use the app without logging
- Activity only recorded when user email is available
- Each user only sees their own activities

✅ **No sensitive data stored**
- Just references to books/verses/timestamps
- No verse text or user content stored in activity tables

---

## 🚀 Features at a Glance

| Feature | Status | Details |
|---------|--------|---------|
| Automatic logging | ✅ | No code needed, happens automatically |
| Real-time display | ✅ | Dashboard shows activities as they happen |
| Auto-refresh | ✅ | Updates every 15 seconds without manual action |
| Activity links | ✅ | Click activity to jump to that verse |
| Relative timestamps | ✅ | Shows "2h ago" instead of full datetime |
| Activity icons | ✅ | Color-coded by type for quick scanning |
| Extensible | ✅ | Easy to add new activity types |
| Performant | ✅ | Optimized queries, configurable limits |

---

## 📊 Data Flow Diagram

```
User Opens Bible
      ↓
  (Automatic Logging)
      ↓
Activity Stored in Database
      ↓
User Visits Dashboard
      ↓
ActivityFeed Fetches All Activities
      ↓
Displayed with Icons & Colors
      ↓
Auto-Refresh Every 15 Seconds
      ↓
Click Activity → Jump to Verse
```

---

## 🧪 Quick Test

1. **Login to app** - Log in as a user
2. **Open Bible chapter** - Go to Genesis 1:1
3. **Expand a prayer** - Click the heart icon on a verse
4. **Go to dashboard** - Navigate to `/dashboard`
5. **Check activity feed** - You should see:
   - "Visited Genesis Chapter 1"
   - "Expanded prayer for Genesis 1:X"
6. **Watch auto-refresh** - Feed updates every 15 seconds
7. **Click activity** - Should jump to that verse

---

## 📚 Full Documentation

For complete technical details:
- Read: `ACTIVITY_LOGGING_SYSTEM.md` - Full API docs
- Read: `IMPLEMENTATION_SUMMARY.md` - What was changed

---

## ⚡ Performance Tips

### For Large User Base

1. **Set appropriate limits**
   ```tsx
   <ActivityFeed limit={30} />  // Show 30 recent activities
   ```

2. **Adjust refresh interval**
   ```tsx
   <ActivityFeed refreshInterval={30000} />  // Refresh every 30s instead of 15s
   ```

3. **Add database indexes** (optional)
   ```sql
   CREATE INDEX idx_activity_email ON prayer_activity_log(user_email, created_at DESC);
   CREATE INDEX idx_verse_view_email ON verse_view_log(user_email, created_at DESC);
   ```

---

## 🆘 Troubleshooting

### Activity Not Showing Up?

**Problem:** Activities logged but not appearing in feed

**Solutions:**
1. Check user is logged in: `/api/auth/session` should return user email
2. Check browser console for fetch errors
3. Verify correct userEmail is passed to ActivityFeed
4. Check database: `SELECT COUNT(*) FROM prayer_activity_log;`

### Auto-Refresh Not Working?

**Problem:** Feed doesn't update every 15 seconds

**Solutions:**
1. Check network tab - should see API calls every 15s
2. Check for JavaScript errors in console
3. Verify `autoRefresh={true}` is set
4. Try manual refresh button in activity feed

### Activities Too Old/Too New?

**Problem:** Activities from wrong time period showing

**Solutions:**
1. Increase `limit` prop to see more: `limit={100}`
2. Activities are sorted newest first by default
3. Clear old data if too much: `DELETE FROM prayer_activity_log WHERE created_at < NOW() - INTERVAL '90 days';`

---

## 🎁 What Comes Next

With this system in place, you can easily add:

- 📈 **Reading Statistics** - Show "You've read 15 chapters this month"
- 🔥 **Reading Streaks** - Track consecutive days of reading
- 🎯 **Achievements** - Unlock badges like "Read whole book in one week"
- 📧 **Notifications** - Email users their weekly activity summary
- 📊 **Admin Dashboard** - Show app-wide usage statistics
- 💡 **Recommendations** - Suggest verses based on reading history
- 📥 **Export** - Let users download their activity history as CSV

---

## 💡 Pro Tips

1. **Performance**: Activity-log queries are optimized with proper JOINs
2. **Privacy**: Only authenticated users tracked, guests unaffected
3. **Extensibility**: Adding new activity types takes 5 minutes
4. **Scalability**: System designed to handle thousands of users
5. **Maintenance**: Consider archiving activities older than 1 year

---

## 📞 Support

For questions about the activity logging system:
1. Check the **ACTIVITY_LOGGING_SYSTEM.md** file
2. Review **IMPLEMENTATION_SUMMARY.md** for what was changed
3. Look at the **ActivityFeed component** for prop options

---

**🚀 You're all set! The activity logging system is live and tracking!**

Users won't see any difference in how the app works - everything happens automatically in the background. But on the dashboard, they'll see a beautiful activity feed showing their Bible reading journey in real-time.
