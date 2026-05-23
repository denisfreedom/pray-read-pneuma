# Bulk Import Testing Checklist

## Pre-Test Setup ✅

- [x] Dual-Source Import section removed from admin panel
- [x] Bulk Import section uses JSON format only
- [x] Language auto-detection implemented (from `lang_short`)
- [x] Test files created and ready
- [x] API endpoint tested and working

## Test 1: English Genesis Import

**Step 1: Navigate to Admin Panel**
```
URL: https://ikplaovco14ju2kcztkwh.web-preview.appgen.com/admin-panel
```

**Step 2: Locate Bulk Import Section**
- Scroll down to find "📤 Bulk Import Bible Content"
- Should see:
  - Expected JSON format displayed
  - File upload input box
  - Note about metadata auto-detection

**Step 3: Upload English Test File**
1. Click file input box
2. Select `/public/test-genesis-kjv.json`
3. Wait for upload and processing

**Expected Result:**
```
✅ Import complete: 8 verses imported, 0 errors
📊 Import Summary
   Success: 8
   Errors: 0
   Success Rate: 100%
   Books: 1 (Genesis)
   Chapters: 1 (Genesis 1)
```

**Pass Criteria:**
- [ ] Progress bar appears and reaches 100%
- [ ] Green success message displays
- [ ] Statistics show 8 verses imported
- [ ] Zero errors reported
- [ ] No error messages in console

---

## Test 2: Luganda Genesis Import

**Step 1: Return to Bulk Import Section**
- Same location in Admin Panel

**Step 2: Upload Luganda Test File**
1. Click file input box again
2. Select `/public/test-genesis-luganda.json`
3. Wait for upload and processing

**Expected Result:**
```
✅ Import complete: 8 verses imported, 0 errors
📊 Import Summary
   Success: 8
   Errors: 0
   Success Rate: 100%
   Books: 1 (Genesisi)
   Chapters: 1 (Genesisi 1)
```

**Pass Criteria:**
- [ ] Progress bar appears and reaches 100%
- [ ] Green success message displays
- [ ] Statistics show 8 verses imported
- [ ] Zero errors reported
- [ ] No error messages in console

---

## Test 3: Verify English Import in Bible Reader

**Step 1: Navigate to Bible Reader**
```
URL: https://ikplaovco14ju2kcztkwh.web-preview.appgen.com/bible-reader
```

**Step 2: Select Genesis**
1. Click on "Genesis" book (or search for it)
2. Select "Chapter 1"

**Step 3: Verify English Text**
Check that verses 1-8 display with English KJV text:
- [ ] Verse 1: "In the beginning God created..."
- [ ] Verse 2: "And the earth was without form..."
- [ ] Verse 3: "And God said, Let there be light..."
- [ ] Verse 4: "And God saw the light, that it was good..."
- [ ] Verse 5: "And God called the light Day..."
- [ ] Verse 6: "And God said, Let there be a firmament..."
- [ ] Verse 7: "And God made the firmament..."
- [ ] Verse 8: "And God called the firmament Heaven..."

**Pass Criteria:**
- [ ] All 8 verses display correctly
- [ ] Text matches test file content
- [ ] No truncation or formatting issues
- [ ] Verses show proper numbering (1-8)

---

## Test 4: Verify Luganda Import in Bible Reader

**Step 1: In Same Genesis Chapter 1**
- Already on correct page

**Step 2: Toggle Language to Luganda**
1. Look for language selector (flag icon or dropdown)
2. Change from English to Luganda

**Step 3: Verify Luganda Text**
Check that verses 1-8 display with Luganda translation:
- [ ] Verse 1: "Mu maso okusooka Katonda akola..."
- [ ] Verse 2: "N'ensi ye yali etaali na ndowooza..."
- [ ] Verse 3: "Katonda n'akubaganya nti..."
- [ ] Verse 4: "Katonda n'alabe okukoza..."
- [ ] Verse 5: "Katonda n'akawo okukoza erinnya..."
- [ ] Verse 6: "Katonda n'akubaganya nti..."
- [ ] Verse 7: "Katonda n'akola embeera..."
- [ ] Verse 8: "Katonda n'akawo embeera erinnya..."

**Pass Criteria:**
- [ ] All 8 verses display in Luganda
- [ ] Text matches test file content
- [ ] Language toggle works smoothly
- [ ] No console errors during toggle

---

## Test 5: Database Verification (Optional)

**Step 1: Check Genesis in Database**
```sql
SELECT book_id, chapter, verse, text_english, text_luganda 
FROM bible_verses 
WHERE chapter = 1 
ORDER BY verse;
```

**Expected Results:**
- [ ] 8 rows for Genesis 1:1-8
- [ ] `text_english` column filled with English KJV
- [ ] `text_luganda` column filled with Luganda text
- [ ] Both languages present for same verses

---

## Test 6: 502 Error Verification

**No 502 Errors Expected For:**
- [ ] Uploading genesis-kjv.json
- [ ] Uploading genesis-luganda.json
- [ ] Viewing import statistics
- [ ] Toggling languages in Bible Reader
- [ ] Searching for Genesis verses
- [ ] Page refresh after import

**If 502 Appears:**
1. Check server logs: `check_logs` with lines=100
2. Check console: `check_console_logs` with limit=50
3. Verify database connection is active
4. Try uploading smaller file (test with just 1 verse)

---

## Test 7: Error Handling

**Test 1: Invalid JSON**
1. Create file with invalid JSON: `{"bad": json}`
2. Upload to admin panel
3. Expected: Error message about JSON format

- [ ] Error message appears
- [ ] No crash or 502
- [ ] Clear error description shown

**Test 2: Missing Required Fields**
1. Create JSON missing `text` field in a verse
2. Upload to admin panel
3. Expected: Error message about missing field

- [ ] Error message shows row number
- [ ] No crash or 502
- [ ] Can retry with corrected file

**Test 3: Unknown Book Name**
1. Create JSON with book_name: "FakeBook"
2. Upload to admin panel
3. Expected: Error "Book not found"

- [ ] Error shows which verse failed
- [ ] Other verses (if any) still import
- [ ] Success count reflects actual imports

---

## Final Verification

**Overall Status:**
- [ ] Dual-Source Import removed
- [ ] Bulk Import using JSON only
- [ ] Auto-language detection working
- [ ] English import successful (8/8 verses)
- [ ] Luganda import successful (8/8 verses)
- [ ] Both visible in Bible Reader
- [ ] Language toggle functional
- [ ] No 502 errors encountered
- [ ] Error handling works correctly
- [ ] All 10 tests passed

---

## Performance Notes

**Expected Times:**
- Test file (8 verses) upload: < 1 second
- Test file processing: < 1 second
- Total per import: < 3 seconds
- Bible Reader load: < 2 seconds

If slower, check:
- [ ] Database connection latency
- [ ] Server load (check logs)
- [ ] Network connection
- [ ] Browser cache (clear if needed)

---

## Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Status:** [ ] PASS [ ] FAIL  
**Notes:** _______________

---

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| 502 Error | Check logs, verify DB connection |
| Import shows 0 verses | Check book name matches DB |
| Text doesn't appear | Reload Bible Reader page |
| Language toggle broken | Check console for JS errors |
| File won't upload | Verify JSON is valid |
| Verses appear twice | May have duplicate import - check DB |

---

**Test Environment:**
- URL: `https://ikplaovco14ju2kcztkwh.web-preview.appgen.com`
- Test Files: `/public/test-*.json`
- Admin Panel: `/admin-panel`
