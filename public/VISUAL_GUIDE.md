# Bulk Import - Visual Guide

## Admin Panel Location

**URL:** `https://ikplaovco14ju2kcztkwh.web-preview.appgen.com/admin-panel`

Scroll down to find this section (near the bottom):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 BULK IMPORT BIBLE CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Upload JSON files containing Bible verses. The import will auto-detect 
the language from the metadata.

┌─────────────────────────────────────────────────────────────────┐
│ Expected JSON Format:                                           │
│                                                                 │
│ {                                                               │
│   "metadata": {                                                 │
│     "name": "Authorized King James Version",                    │
│     "lang": "English",                                          │
│     "lang_short": "en"                                          │
│   },                                                            │
│   "verses": [                                                   │
│     {                                                           │
│       "book_name": "Genesis",                                   │
│       "chapter": 1,                                             │
│       "verse": 1,                                               │
│       "text": "In the beginning..."                             │
│     }                                                           │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

Upload JSON File
┌────────────────────────────────────────────┐
│ [📎 Choose File] (or drag and drop)       │
│ Upload JSON files with metadata and        │
│ verses array                               │
└────────────────────────────────────────────┘
```

## Import Process Steps

### Step 1: Select File
```
┌─ File Dialog ─────────────────────────┐
│                                       │
│ 📁 public/                            │
│   └── 📄 test-genesis-kjv.json       │
│                                       │
│ Select the test file or your file    │
└─────────────────────────────────────┘
```

### Step 2: Upload Starts
```
Progress bar appears:

Import Progress: 45% 
████████████░░░░░░░░ (uploading...)
```

### Step 3: Processing
```
📤 Uploading 8 verses...

Progress bar updates:

Import Progress: 85%
███████████████░░░░░ (processing...)
```

### Step 4: Success
```
✅ Import complete: 8 verses imported, 0 errors

📊 Import Summary
┌─────────────────────────────────────┐
│ ✅ Success:     8 verses            │
│ ❌ Errors:      0                   │
│ 📊 Success:     100%                │
│ 📚 Books:       1 (Genesis)         │
│ 📖 Chapters:    1 (Genesis 1)       │
└─────────────────────────────────────┘
```

## Language Support

### English (KJV) Import
```json
{
  "metadata": {
    "lang_short": "en"     ← English code
  }
}

Result: Text imported to text_english column
```

In Bible Reader:
```
Genesis 1:1
═════════════════════════════════════════
🇬🇧 English (selected)

"In the beginning God created the heaven 
and the earth."
```

### Luganda Import
```json
{
  "metadata": {
    "lang_short": "lg"     ← Luganda code
  }
}

Result: Text imported to text_luganda column
```

In Bible Reader:
```
Genesis 1:1
═════════════════════════════════════════
🇺🇬 Luganda (selected)

"Mu maso okusooka Katonda akola embeera 
n'ensi."
```

## Import Results View

### Success State
```
┌─────────────────────────────────────────┐
│ ✅ Green Background                    │
│                                        │
│ ✅ Import complete: 8 verses imported, │
│    0 errors                            │
│                                        │
│ Statistics:                            │
│ • 8 verses successfully processed      │
│ • 0 errors encountered                 │
│ • 100% success rate                    │
│ • 1 book processed (Genesis)           │
│ • 1 chapter processed (1)              │
└─────────────────────────────────────────┘
```

### Error State
```
┌─────────────────────────────────────────┐
│ ❌ Red Background                       │
│                                        │
│ ❌ Error: Book "FakeBook" not found    │
│    in database                         │
│                                        │
│ Details:                               │
│ • Row 1: Book lookup failed            │
│ • Please verify book name spelling     │
└─────────────────────────────────────────┘
```

## Language Toggle in Bible Reader

**Before Import:**
```
Genesis 1
═════════════════════════════════════════
No verses loaded
```

**After English Import:**
```
Genesis 1
═════════════════════════════════════════
🇬🇧 English ▼

1. In the beginning God created the heaven 
   and the earth.

2. And the earth was without form, and void; 
   and darkness was upon the face of the deep...
```

**After Toggling to Luganda:**
```
Genesis 1
═════════════════════════════════════════
🇺🇬 Luganda ▼

1. Mu maso okusooka Katonda akola embeera 
   n'ensi.

2. N'ensi ye yali etaali na ndowooza, era 
   etaali na kasita; n'ekizikiza kyali ku nsi...
```

## Test File Structure

### Genesis KJV (test-genesis-kjv.json)
```
📄 test-genesis-kjv.json
├─ metadata
│  ├─ name: "Authorized King James Version"
│  ├─ lang: "English"
│  └─ lang_short: "en"
└─ verses
   ├─ verse 1:1 ✓
   ├─ verse 1:2 ✓
   ├─ verse 1:3 ✓
   ├─ verse 1:4 ✓
   ├─ verse 1:5 ✓
   ├─ verse 1:6 ✓
   ├─ verse 1:7 ✓
   └─ verse 1:8 ✓

Total: 8 verses, 1 chapter, 1 book
```

### Genesis Luganda (test-genesis-luganda.json)
```
📄 test-genesis-luganda.json
├─ metadata
│  ├─ name: "Biblia Entukuvu"
│  ├─ lang: "Luganda"
│  └─ lang_short: "lg"
└─ verses
   ├─ verse 1:1 (Genesisi) ✓
   ├─ verse 1:2 ✓
   ├─ verse 1:3 ✓
   ├─ verse 1:4 ✓
   ├─ verse 1:5 ✓
   ├─ verse 1:6 ✓
   ├─ verse 1:7 ✓
   └─ verse 1:8 ✓

Total: 8 verses, 1 chapter, 1 book
```

## Error Examples

### Example 1: Invalid JSON
```
❌ Error: Invalid JSON format

Details: JSON parse error at position 45
Expected "{" or "[" at start of object

Received preview: {"bad": json syntax"}
                          ↑ Error here

Fix: Check JSON syntax and try again
```

### Example 2: Missing Required Field
```
❌ Error: Missing required fields

Row 3: Missing required field 'text'
       Each verse must have: book_name, chapter, verse, text

Fix: Add the 'text' field to verse and retry
```

### Example 3: Book Not Found
```
❌ Error: Book not found

Row 5 (Genesis 2:5): Book "Genesis" not found in database

Fix: Verify book name spelling:
     English: "Genesis", "Exodus", "Leviticus"
     Luganda: "Genesisi", "Ekisolo", "Leva"
```

## Workflow Timeline

```
Timeline:
═════════════════════════════════════════

[1] Open Admin Panel        📍 /admin-panel
    │
    ├─ Load page
    └─ Scroll to Bulk Import section

[2] Select Test File        📎 test-genesis-kjv.json
    │
    ├─ Click file input
    └─ Choose file from disk

[3] Upload & Process        📤 Uploading...
    │
    ├─ Show progress: 0% → 100%
    ├─ Process verses
    └─ Validate database

[4] Show Results            ✅ Success!
    │
    ├─ Display statistics
    ├─ Show error count (if any)
    └─ Allow next import

[5] Verify in Reader        🔍 /bible-reader
    │
    ├─ Select Genesis
    ├─ View Chapter 1
    ├─ Check English text
    └─ Toggle to Luganda

[6] Repeat                  🔄 Import Luganda
    │
    ├─ Same steps 1-5
    └─ Complete!

Total time: ~5-10 minutes for both imports
```

## Database Result View

After both imports, Genesis 1:1-8 contains:

```sql
SELECT * FROM bible_verses 
WHERE book_id=1 AND chapter=1 ORDER BY verse;

┌────┬─────────┬────────────────┬────────────────┐
│ id │ verse   │ text_english    │ text_luganda    │
├────┼─────────┼────────────────┼────────────────┤
│ 1  │ 1       │ In the begin... │ Mu maso oko... │
│ 2  │ 2       │ And the earth.. │ N'ensi ye y... │
│ 3  │ 3       │ And God said... │ Katonda n'a... │
│ 4  │ 4       │ And God saw...  │ Katonda n'a... │
│ 5  │ 5       │ And God called..│ Katonda n'a... │
│ 6  │ 6       │ And God said... │ Katonda n'a... │
│ 7  │ 7       │ And God made... │ Katonda n'a... │
│ 8  │ 8       │ And God called..│ Katonda n'a... │
└────┴─────────┴────────────────┴────────────────┘
```

## Quick Reference Box

```
╔════════════════════════════════════════╗
║       BULK IMPORT QUICK REFERENCE      ║
╠════════════════════════════════════════╣
║                                        ║
║ Admin Panel: /admin-panel              ║
║                                        ║
║ Format: JSON only                      ║
║                                        ║
║ Language codes:                        ║
║  • "en"  → English                     ║
║  • "lg"  → Luganda                     ║
║                                        ║
║ Max file size: 50 MB                   ║
║                                        ║
║ Test files:                            ║
║  • test-genesis-kjv.json               ║
║  • test-genesis-luganda.json           ║
║                                        ║
║ Expected time: < 3 seconds per file    ║
║                                        ║
╚════════════════════════════════════════╝
```

---

**Visual Guide Ready for Use** ✅
Access via: https://ikplaovco14ju2kcztkwh.web-preview.appgen.com/admin-panel
