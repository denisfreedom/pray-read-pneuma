# 🎵 Verse-Songs Feature - Complete Admin Guide

## Overview

**Verse-Songs** is a new music streaming module in the Pray-Read Bible app that allows users to listen to Bible verses turned into beautiful worship songs. The feature includes:

- **Multiple Series/Playlists** - Organize songs into themed collections (e.g., "Psalms of Praise", "Gospel Melodies")
- **Song Management** - Add, edit, and delete songs within each series
- **Audio Streaming** - Direct MP3 URL streaming with custom audio player
- **User Engagement** - Likes, favorites, play count tracking
- **Resume Playback** - Users can resume from where they last stopped
- **Analytics** - Track most played songs and user listening habits

---

## 📊 Database Architecture

### Tables Created

#### 1. `verse_song_series`
Stores podcast/music series/playlists information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique series ID |
| `title` | VARCHAR(255) | Series name (required) |
| `description` | TEXT | Series description |
| `thumbnail` | TEXT | Series cover image URL |
| `is_featured` | BOOLEAN | Show on featured section |
| `display_order` | INTEGER | Sort order for display |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

#### 2. `verse_songs`
Stores individual songs/episodes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique song ID |
| `series_id` | INTEGER FK | Reference to series |
| `title` | VARCHAR(255) | Song name (required) |
| `description` | TEXT | Song description |
| `mp3_url` | TEXT | Direct MP3 URL (required) |
| `thumbnail` | TEXT | Song artwork URL |
| `duration` | INTEGER | Duration in seconds |
| `likes_count` | INTEGER | Number of likes (auto-updated) |
| `play_count` | INTEGER | Number of plays (auto-updated) |
| `is_published` | BOOLEAN | Publish status |
| `created_at` | TIMESTAMP | Created at |
| `updated_at` | TIMESTAMP | Updated at |

#### 3. `user_verse_song_favorites`
Tracks which users favorited which songs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Record ID |
| `user_email` | TEXT | User email (foreign key) |
| `verse_song_id` | INTEGER FK | Song ID |
| `created_at` | TIMESTAMP | When favorited |
| **Constraint** | UNIQUE | One entry per user-song pair |

#### 4. `user_verse_song_likes`
Tracks which users liked which songs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Record ID |
| `user_email` | TEXT | User email (foreign key) |
| `verse_song_id` | INTEGER FK | Song ID |
| `created_at` | TIMESTAMP | When liked |
| **Constraint** | UNIQUE | One entry per user-song pair |

#### 5. `user_verse_song_progress`
Tracks resume playback position per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Record ID |
| `user_email` | TEXT | User email (foreign key) |
| `verse_song_id` | INTEGER FK | Song ID |
| `last_position_seconds` | INTEGER | Resume position in seconds |
| `completed` | BOOLEAN | Marked as completed |
| `updated_at` | TIMESTAMP | Last update |
| **Constraint** | UNIQUE | One entry per user-song pair |

#### 6. `user_verse_song_plays`
Analytics: logs every play event.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Record ID |
| `user_email` | TEXT | Who played |
| `verse_song_id` | INTEGER FK | Which song |
| `play_duration_seconds` | INTEGER | How long they listened |
| `played_at` | TIMESTAMP | When they played |

---

## 🔌 API Routes

All API endpoints are located in `/app/api/verse-songs/` and supporting directories.

### 1. Series Management

#### `GET /api/verse-song-series`
Fetch all series.

**Query Parameters:**
- `id` - Get specific series by ID
- `featured=true` - Get only featured series

**Response:**
```json
[
  {
    "id": 1,
    "title": "Psalms of Praise",
    "description": "Worship songs...",
    "thumbnail": "https://...",
    "is_featured": true,
    "display_order": 1
  }
]
```

#### `POST /api/verse-song-series`
Create new series.

**Body:**
```json
{
  "title": "Psalms of Praise",
  "description": "Worship songs...",
  "thumbnail": "https://...",
  "is_featured": true,
  "display_order": 1
}
```

#### `PUT /api/verse-song-series`
Update existing series.

**Body:**
```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Updated description...",
  "thumbnail": "https://...",
  "is_featured": false,
  "display_order": 2
}
```

#### `DELETE /api/verse-song-series?id={seriesId}`
Delete series (cascades to songs).

---

### 2. Song Management

#### `GET /api/verse-songs`
Fetch songs with filters.

**Query Parameters:**
- `id` - Get specific song
- `seriesId` - Get all songs in a series
- `mostPlayed=true` - Sort by play count
- `recentlyAdded=true` - Sort by date
- `limit` - Number of results (default: 10)
- `userEmail` - Include user interaction flags (liked, favorited)

**Response:**
```json
[
  {
    "id": 1,
    "series_id": 1,
    "title": "Psalm 23: The Lord is My Shepherd",
    "description": "A timeless classic...",
    "mp3_url": "https://...",
    "thumbnail": "https://...",
    "duration": 240,
    "likes_count": 45,
    "play_count": 128,
    "is_published": true,
    "user_liked": false,
    "user_favorited": true,
    "series_title": "Psalms of Praise"
  }
]
```

#### `POST /api/verse-songs`
Create new song.

**Body:**
```json
{
  "series_id": 1,
  "title": "Song Title",
  "description": "Description...",
  "mp3_url": "https://example.com/song.mp3",
  "thumbnail": "https://...",
  "duration": 240,
  "is_published": true
}
```

#### `PUT /api/verse-songs`
Update song.

**Body:**
```json
{
  "id": 1,
  "series_id": 1,
  "title": "Updated Title",
  "description": "...",
  "mp3_url": "...",
  "thumbnail": "...",
  "duration": 250,
  "is_published": true
}
```

#### `DELETE /api/verse-songs?id={songId}`
Delete song.

---

### 3. Likes Management

#### `POST /api/verse-songs/likes`
Like a song.

**Body:**
```json
{
  "userEmail": "user@example.com",
  "verseSongId": 1
}
```

#### `DELETE /api/verse-songs/likes?userEmail={email}&verseSongId={id}`
Unlike a song.

---

### 4. Favorites Management

#### `GET /api/verse-songs/favorites?userEmail={email}`
Get user's favorite songs.

#### `POST /api/verse-songs/favorites`
Add song to favorites.

**Body:**
```json
{
  "userEmail": "user@example.com",
  "verseSongId": 1
}
```

#### `DELETE /api/verse-songs/favorites?userEmail={email}&verseSongId={id}`
Remove from favorites.

---

### 5. Playback Progress

#### `GET /api/verse-songs/progress?userEmail={email}&verseSongId={id}`
Get resume position.

#### `POST /api/verse-songs/progress`
Save resume position.

**Body:**
```json
{
  "userEmail": "user@example.com",
  "verseSongId": 1,
  "lastPositionSeconds": 45,
  "completed": false
}
```

---

### 6. Play Analytics

#### `POST /api/verse-songs/play`
Record a play event (increments play_count).

**Body:**
```json
{
  "userEmail": "user@example.com",
  "verseSongId": 1,
  "playDurationSeconds": 240
}
```

#### `GET /api/verse-songs/play?userEmail={email}`
Get user's play history.

---

## 🎛️ Admin Panel Usage

### Accessing Verse-Songs Management

1. Go to **Admin Panel** (`/admin-panel`)
2. Scroll down to **Verse-Songs Management** section (purple header with 🎵 icon)

### Creating a Series

1. Click **"+ Add New Series"** button
2. Fill in:
   - **Series Title** (required)
   - **Description** (optional)
   - **Thumbnail URL** (image URL - see samples below)
   - **Featured Series** checkbox (shows on homepage)
3. Click **"✅ Create Series"**

### Adding Songs to a Series

1. Click on a series from the left panel to select it
2. Click **"+ Add Song"** button (appears in songs section)
3. Fill in:
   - **Song Title** (required)
   - **Description** (optional)
   - **MP3 URL** (required - direct link to .mp3 file)
   - **Thumbnail URL** (optional)
   - **Duration** (optional - in seconds)
4. Click **"✅ Add Song"**

### Managing Series & Songs

- **Delete Series**: Click 🗑️ Delete button next to series name (deletes all songs in it)
- **Delete Song**: Click 🗑️ button in song card (deletes that song only)
- **View Stats**: See likes count and play count for each song

### Sample Image URLs

Use these freely-available stock images for thumbnails:

**Series Thumbnails:**
- Psalms: `https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop`
- Gospel: `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop`
- Worship: `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop`
- Proverbs: `https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop`
- Christmas: `https://images.unsplash.com/photo-1446424654645-0ced19b20d75?w=400&h=400&fit=crop`

**Song Thumbnails:**
- Music Generic: `https://images.unsplash.com/photo-1501612993347-a3fefee18d8f?w=300&h=300&fit=crop`
- Headphones: `https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop`
- Worship: `https://images.unsplash.com/photo-1516633472601-5e51ee6dcad1?w=300&h=300&fit=crop`

---

## 🎧 Frontend Pages

### 1. Verse-Songs Landing Page
**URL:** `/verse-songs`

Features:
- Featured series carousel
- Most played songs section
- Recently added songs section
- All series grid
- Current song player (sticky at top)
- Search & filter capabilities

### 2. Series Detail Page
**URL:** `/verse-songs/[seriesId]`

Features:
- Series cover art and description
- All songs in series (playlist view)
- Audio player for each song
- Like and favorite buttons
- Play count tracking

---

## 📱 Frontend Components

### VerseSongPlayer
**Location:** `/app/components/VerseSongPlayer.tsx`

Custom audio player with:
- Play/Pause button
- Progress bar with seek
- Time display (current / total)
- Volume control
- Mute button

**Props:**
```typescript
interface VerseSongPlayerProps {
  songId: number;
  title: string;
  duration: number;
  mp3Url: string;
  onPlayComplete?: () => void;
  onProgress?: (seconds: number) => void;
}
```

### VerseSongCard
**Location:** `/app/components/VerseSongCard.tsx`

Displays individual song with:
- Thumbnail image
- Title and description
- Duration badge
- Play count badge
- Like button (with count)
- Favorite button
- Play button overlay

### VerseSongSeriesCard
**Location:** `/app/components/VerseSongSeriesCard.tsx`

Displays series card with:
- Cover image
- Title and description
- Song count
- Featured badge (if applicable)
- Click to open series

---

## 🔄 Data Flow

### User Playing a Song

1. User clicks "Play" button on song card
2. `VerseSongPlayer` component loads with song URL
3. User presses Play
4. Song begins streaming from MP3 URL
5. On completion → `onPlayComplete()` → POST to `/api/verse-songs/play`
6. Play count increments in database
7. Progress is saved every few seconds via `/api/verse-songs/progress`

### User Liking a Song

1. User clicks heart icon
2. POST to `/api/verse-songs/likes` with userEmail & songId
3. If already liked → DELETE to unlike
4. Likes count updates immediately in UI
5. Backend increments/decrements `likes_count` in verse_songs table

### User Adding to Favorites

1. User clicks bookmark icon
2. POST to `/api/verse-songs/favorites` with userEmail & songId
3. If already favorited → DELETE to remove
4. Song appears in user's favorites
5. Favorites list accessible from dashboard

---

## 📊 Analytics & Insights

### Most Played Songs
Query: `GET /api/verse-songs?mostPlayed=true&limit=6`
- Sorts by `play_count` DESC
- Useful for homepage featured section

### Recently Added
Query: `GET /api/verse-songs?recentlyAdded=true&limit=6`
- Sorts by `created_at` DESC
- Shows newest content

### User Engagement
- Track `user_verse_song_plays` table for play history
- Track `user_verse_song_likes` table for engagement metrics
- Track `user_verse_song_favorites` table for saved items

---

## 🔒 Best Practices

### MP3 URLs
- Use direct links to .mp3 files (not YouTube, not Spotify)
- Ensure URLs are publicly accessible
- Test URL in browser before saving
- Use high-quality audio (128-320 kbps recommended)
- Consider CDN hosting for large files

### Thumbnails
- Use square images (400x400 or larger)
- Optimize file size (< 200KB recommended)
- Ensure images are publicly accessible
- Use consistent branding across series

### Series Organization
- Group songs by theme (Psalms, Gospel, Prayer, etc.)
- Mark 3-5 series as "Featured" for homepage
- Use meaningful descriptions (50-200 characters)
- Order series by popularity or planned release

### Song Metadata
- Clear, descriptive titles (avoid abbreviations)
- Brief descriptions (1-2 sentences)
- Accurate durations (helps users plan listening)
- Thumbnail that matches series theme

---

## 🚀 Feature Expansion Ideas

Future enhancements that could be added:
1. **Lyrics Display** - Show song lyrics synchronized to playback
2. **Playlists** - Users create custom playlists from songs
3. **Audio Quality Options** - 128kbps, 192kbps, 320kbps
4. **Offline Mode** - Download songs for offline listening
5. **Share to Social** - Share songs on Facebook, WhatsApp
6. **Comments/Reviews** - User feedback on songs
7. **Artist Info** - Credit composers, musicians, singers
8. **Recommendations** - Suggest songs based on listening history
9. **Collaborative Playlists** - Group worship playlists
10. **Live Streaming** - Live worship events

---

## 🐛 Troubleshooting

### Songs Not Playing
- Check MP3 URL is accessible (open in browser)
- Verify CORS headers allow streaming
- Check file size isn't excessive
- Ensure URL has .mp3 extension or proper MIME type

### Likes/Favorites Not Saving
- Verify user is logged in (check session)
- Check browser console for errors
- Verify database connection
- Check if UNIQUE constraint is being violated

### Images Not Displaying
- Verify URL is publicly accessible
- Check image format (JPG, PNG, WebP)
- Verify URL is complete and includes protocol (https://)
- Ensure no CORS restrictions

### Play Count Not Incrementing
- Verify `onPlayComplete()` is being called
- Check network tab for POST to `/api/verse-songs/play`
- Verify userEmail is being passed

---

## 📞 Support

For issues or questions:
1. Check app logs at `/debug-info`
2. Review network requests in browser DevTools
3. Verify database connection is active
4. Check auth session is valid
5. Test with sample data from pre-loaded series

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
