# Bulk Import Testing Guide

## Overview
The **Bulk Import Bible Content** section in the Admin Panel now exclusively uses JSON format with auto-language detection. The Dual-Source Import section has been removed.

## JSON Format Specification

Your bulk import expects this exact format:

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

## Required Fields

### Metadata (Auto-Detection)
- `name`: Bible version name
- `shortname`: Short code (e.g., KJV)
- `module`: Module identifier
- `year`: Publication year
- `lang`: Full language name (e.g., "English", "Luganda")
- **`lang_short`**: Language code for auto-detection
  - `"en"` or `"eng"` → English import
  - `"lg"` or `"lug"` → Luganda import

### Verses Array
Each verse must have:
- `book_name`: Book name (must match database - "Genesis", "Exodus", "Genesisi" in Luganda, etc.)
- `chapter`: Chapter number (integer)
- `verse`: Verse number (integer)
- `text`: The verse text (string)

## Test Files Included

### 1. English (KJV) Test File
**File:** `test-genesis-kjv.json`
- **Content:** Genesis 1:1-8 in King James Version
- **Language:** English (`lang_short: "en"`)
- **Expected:** Imports to `text_english` column

### 2. Luganda Test File
**File:** `test-genesis-luganda.json`
- **Content:** Genesis 1:1-8 in Luganda
- **Language:** Luganda (`lang_short: "lg"`)
- **Expected:** Imports to `text_luganda` column

## How to Test

### Step 1: Navigate to Admin Panel
1. Go to `/admin-panel`
2. Scroll to the **📤 Bulk Import Bible Content** section

### Step 2: Import English Version
1. Click the file upload input
2. Select `test-genesis-kjv.json`
3. Wait for import to complete
4. Expected result:
   ```
   ✅ Import complete: 8 verses imported, 0 errors
   📊 Success: 8, Errors: 0, Success Rate: 100%
   ```

### Step 3: Verify English Import
1. Go to Bible Reader (`/bible-reader`)
2. Select **Genesis** > **Chapter 1**
3. Verify verses 1-8 display in English

### Step 4: Import Luganda Version
1. Return to Admin Panel
2. Scroll to **Bulk Import** section
3. Select `test-genesis-luganda.json`
4. Wait for import to complete
5. Expected result:
   ```
   ✅ Import complete: 8 verses imported, 0 errors
   📊 Success: 8, Errors: 0, Success Rate: 100%
   ```

### Step 5: Verify Luganda Import
1. Go to Bible Reader (`/bible-reader`)
2. Select **Genesis** > **Chapter 1**
3. Toggle language to **Luganda**
4. Verify verses 1-8 display in Luganda

## Import Features

### Auto-Language Detection
- Reads `lang_short` from metadata
- Routes to correct language column:
  - English (`en`, `eng`) → `text_english`
  - Luganda (`lg`, `lug`) → `text_luganda`

### Smart Updates
- If verse already exists: **Updates** the language-specific column
- If verse is new: **Inserts** it with the imported language
- Other language column untouched (can import both separately)

### Error Handling
- Validates JSON structure
- Checks for required fields
- Validates book names against database
- Reports errors with verse location (row number)
- Shows first 20 errors for debugging

### Progress Tracking
- Real-time progress bar (0-100%)
- Import summary with statistics:
  - Verses imported
  - Errors encountered
  - Success rate percentage
  - Books processed
  - Chapters processed

## Example: Importing Both Languages for Genesis 1

### First Import (English):
```bash
Upload: test-genesis-kjv.json
Result: Genesis 1:1-8 in English
```

### Second Import (Luganda):
```bash
Upload: test-genesis-luganda.json
Result: Genesis 1:1-8 in Luganda
```

### Final Result:
Users see both English and Luganda versions in the Bible Reader with language toggle.

## Troubleshooting

### Import Shows 0 Errors but Verses Don't Appear
- Check database connection
- Verify Genesis book exists in database
- Check if it's imported under different name

### "Book Not Found" Error
- Verify exact book name spelling
- Check `bible_books` table for book name
- Luganda books may have different names (e.g., "Genesisi")

### File Size Limit
- Maximum file size: **50 MB**
- For larger imports, split into multiple files by book or testament

### JSON Validation Errors
- Ensure valid JSON format
- Verify all required fields present
- Check for special characters in text

## Performance Notes

- 1000 verses: ~5-10 seconds
- 10,000 verses: ~30-60 seconds
- 100,000 verses: ~5-15 minutes

Each verse triggers database lookups, so batch imports can be slow. For very large imports (1M+ verses), consider breaking into multiple files.

## Notes

- ✅ Only JSON format supported (CSV removed)
- ✅ Auto-language detection from metadata
- ✅ Both languages can be imported separately
- ✅ Verses update if they already exist
- ✅ No limit on books per import
- ✅ Detailed error reporting with line numbers
