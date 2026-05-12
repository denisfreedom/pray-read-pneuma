# Audio Bible Setup Guide

## Current Status
✅ Audio Player UI is fully functional and ready
❌ Audio files are not yet configured

## What You Need to Do

### Step 1: Get Audio Files
You need MP3 audio files for each chapter of the Bible. Here are your options:

**Option A: Record Your Own**
- Record yourself or someone reading each chapter
- Export as MP3 files
- Name them consistently (e.g., `Genesis-1.mp3`, `Genesis-2.mp3`)

**Option B: Use Existing Audio Bibles**
- Purchase from YouVersion API, Faith Comes By Hearing, or similar services
- Ensure you have proper licensing rights
- Download in MP3 format

**Option C: Use Free Public Domain**
- Look for public domain audio Bible recordings
- Examples: Bible.is, Faith Comes By Hearing (some free versions)
- Check licensing before using

### Step 2: Upload Audio Files to a Hosting Service

**Recommended Options:**

**Option 1: AWS S3 (Best for production)**
1. Create an AWS account at aws.amazon.com
2. Create an S3 bucket (e.g., `my-bible-audio`)
3. Upload your audio files with this structure:
   ```
   /english/Genesis/1.mp3
   /english/Genesis/2.mp3
   /english/Exodus/1.mp3
   /luganda/Genesis/1.mp3
   ```
4. Make files publicly accessible or use signed URLs
5. Get the base URL (e.g., `https://my-bible-audio.s3.amazonaws.com`)

**Option 2: Cloudinary (Easy to use)**
1. Sign up at cloudinary.com (free tier available)
2. Upload audio files
3. Get the base URL from your Cloudinary dashboard

**Option 3: Vercel Blob Storage (If on Vercel)**
1. Use Vercel Blob if your app is deployed on Vercel
2. Upload files via Vercel dashboard
3. Get the blob URL

### Step 3: Update the AudioPlayer Component

Open `/home/user/apps/web/components/AudioPlayer.tsx` and find the `getAudioUrl` function (around line 40).

**Replace this:**
```typescript
const getAudioUrl = (book: string, chapterNum: number): string => {
  return `https://example.com/audio/${book.replace(/\s/g, '-')}-${chapterNum}.mp3`;
};
```

**With your actual URL pattern:**

**Example for AWS S3:**
```typescript
const getAudioUrl = (book: string, chapterNum: number): string => {
  const baseUrl = 'https://my-bible-audio.s3.amazonaws.com';
  const language = 'english'; // or make this dynamic
  return `${baseUrl}/${language}/${book.replace(/\s/g, '-')}/${chapterNum}.mp3`;
};
```

**Example for Cloudinary:**
```typescript
const getAudioUrl = (book: string, chapterNum: number): string => {
  const cloudName = 'your-cloud-name';
  return `https://res.cloudinary.com/${cloudName}/video/upload/bible-audio/${book.replace(/\s/g, '-')}-${chapterNum}.mp3`;
};
```

### Step 4: File Naming Convention

Make sure your audio files follow a consistent naming pattern. Recommended:

**For English:**
```
english/Genesis/1.mp3
english/Genesis/2.mp3
english/Exodus/1.mp3
english/Leviticus/1.mp3
```

**For Luganda:**
```
luganda/Genesis/1.mp3
luganda/Genesis/2.mp3
```

### Step 5: Add Language Selection (Optional)

If you want to support both English and Luganda audio, update the AudioPlayer:

```typescript
interface AudioPlayerProps {
  bookName: string;
  chapter: number;
  testament: string;
  isDark?: boolean;
  language?: 'english' | 'luganda'; // Add this
}

const getAudioUrl = (book: string, chapterNum: number, lang: string): string => {
  const baseUrl = 'https://your-cdn.com';
  return `${baseUrl}/${lang}/${book.replace(/\s/g, '-')}/${chapterNum}.mp3`;
};
```

### Step 6: Test

1. Upload at least one audio file (e.g., Genesis Chapter 1)
2. Update the `getAudioUrl` function with your hosting URL
3. Navigate to Genesis Chapter 1 in your app
4. Click the play button at the bottom of the page
5. Audio should start playing

## File Size Recommendations

- **Bitrate:** 64-128 kbps (good quality for speech)
- **Sample Rate:** 44.1 kHz
- **Format:** MP3 (most compatible)
- **Average size:** 5-15 MB per chapter (depending on length)

## Cost Estimates (AWS S3 Example)

For a complete Bible (1,189 chapters):
- Storage: ~10 GB = $0.23/month
- Transfer: First 100 GB/month free
- Requests: Negligible cost

**Total: Under $1/month for storage**

## Troubleshooting

**"Audio file not available" error:**
- Check that the file exists at the URL
- Verify file is publicly accessible
- Check browser console for CORS errors
- Make sure filename matches exactly (case-sensitive)

**CORS Errors:**
- Add CORS policy to your S3 bucket or CDN
- Allow origin: `*` or your specific domain

**Audio won't play:**
- Check file format is MP3
- Verify browser supports HTML5 audio
- Check network tab for 404 errors

## Example S3 CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## Next Steps After Setup

1. Test with a few chapters first
2. Upload all chapters gradually
3. Add a loading indicator while uploading
4. Consider adding a download option for offline use
5. Add playback speed controls (1x, 1.5x, 2x)

## Questions?

If you need help with any step, just ask! Common questions:
- How to record audio?
- Which hosting service to use?
- How to batch upload files?
- How to add playback speed controls?
