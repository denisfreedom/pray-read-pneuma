# 🧪 Bulk Import Testing Guide

This guide walks you through testing the bulk import functionality end-to-end.

## ✅ Quick Setup (2 minutes)

### Step 1: Login to Admin Panel
1. Go to `https://ikplaovco14ju2kcztkwh.web-preview.appgen.com/login`
2. Use your admin credentials to login
3. Navigate to `/admin-panel`

### Step 2: Locate the Bulk Import Section
- Scroll down to **"📤 Bulk Import Bible Content"**
- You should see only this ONE import section (no Dual-Source Import)

### Step 3: Download Test Files
Two complete Genesis test files are ready:

**Option A: English KJV (8 verses)**
- File: `test-genesis-kjv-complete.json`
- Verses: Genesis 1:1-5, Genesis 2:1-3
- Download: [test-genesis-kjv-complete.json](/public/test-genesis-kjv-complete.json)

**Option B: Luganda (8 verses)**
- File: `test-genesis-luganda-complete.json`
- Verses: Genesis 1:1-5, Genesis 2:1-3 (in Luganda)
- Download: [test-genesis-luganda-complete.json](/public/test-genesis-luganda-complete.json)

## 🚀 Testing Procedure

### Test 1: Import English KJV

1. In the "📤 Bulk Import Bible Content" section, click the file upload area
2. Select `test-genesis-kjv-complete.json`
3. Expected: Import progress bar shows 0% → 50% → 100%
4. Expected result: **"✅ Import complete: 8 verses imported, 0 errors"**
5. Check response box shows:
   - ✅ Success: 8
   - ❌ Errors: 0
   - Success Rate: 100%
   - Books Processed: 1
   - Chapters Processed: 2

### Test 2: Import Luganda

1. Wait 2 seconds after Test 1 completes
2. Click file upload again, select `test-genesis-luganda-complete.json`
3. Expected: Import progress bar shows 0% → 50% → 100%
4. Expected result: **"✅ Import complete: 8 verses imported, 0 errors"**
5. Check response box shows success metrics

### Test 3: Verify Data in Bible Reader

1. Go to `/bible-reader/Genesis/1`
2. Expected: Verse Genesis 1:1 should display:
   - **English**: "In the beginning God created the heaven and the earth."
   - **Luganda**: "Mu nsi ennyimba, Katonda n'akola ggulu ne nsi."
3. Both languages should be present (KJV and Luganda merged in database)

### Test 4: Verify in Admin Panel

1. In Admin Panel, select:
   - Book: **Genesis**
   - Chapter: **1**
   - Verse: **1**
2. Expected: Both English and Luganda texts display
3. Try editing and saving to verify database is writable

## 🔍 Expected JSON Format

```json
{
  "metadata": {
    "name": "Authorized King James Version",
    "shortname": "KJV",
    "module": "kjv",
    "year": 1769,
    "lang": "English",
    "lang_short": "en"
  },
  "verses": [
    {
      "book_name": "Genesis",
      "chapter": 1,
      "verse": 1,
      "text": "In the beginning God created the heaven and the earth."
    }
  ]
}
```

### Metadata Fields:
- `name`: Full Bible name (displayed to user)
- `shortname`: Short abbreviation (e.g., "KJV", "LUG")
- `module`: Internal identifier
- `year`: Year of translation
- `lang`: Full language name ("English" or "Luganda")
- `lang_short`: Language code (**"en"** for English, **"lg"** for Luganda)

### Verses Array Fields:
- `book_name`: Must match existing book in database (e.g., "Genesis", "Exodus")
- `chapter`: Chapter number (integer)
- `verse`: Verse number (integer)
- `text`: Verse text (string)

## ❌ Troubleshooting

### Import Shows "0 errors" but verses don't appear
- Check if Genesis book exists in system
- Verify verses are actually in database (next section)
- Check console logs for detailed errors

### Import Shows Errors
- Verify book names match database exactly
- Check JSON format is valid
- Ensure verse numbers are integers, not strings

### "Failed to save content" Error
- Check that all metadata fields are present
- Verify `lang_short` is either **"en"** or **"lg"**
- Ensure verses array is properly formatted

## 📊 Database Verification

To verify verses were actually saved:

1. Go to `/admin-panel`
2. Scroll to "🔍 Find & Edit Verses"
3. Select:
   - Book: **Genesis**
   - Chapter: **1**
   - Click "Search"
4. Should display: Genesis 1:1-5 with both English and Luganda text

## ✨ Success Criteria

All tests pass if:
- ✅ English import shows 8/8 verses (100% success)
- ✅ Luganda import shows 8/8 verses (100% success)
- ✅ Bible reader displays both languages
- ✅ Admin panel shows both English and Luganda text
- ✅ Database shows 8 total verses for Genesis 1-2

## 📝 Sample Test Results

**After running both tests:**
- Total verses imported: 16 (KJV 8 + Luganda 8)
- Success rate: 100%
- Books affected: Genesis
- Chapters affected: 2
- Database status: ✅ All verses saved with both language variants
