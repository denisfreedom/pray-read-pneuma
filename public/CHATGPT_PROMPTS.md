# ChatGPT Prompts for Bible Data Generation

## Option 1: SINGLE CHAPTER Upload (Recommended for chapter-by-chapter)

Use this prompt when uploading **ONE CHAPTER AT A TIME**. This keeps file sizes small and loading fast.

### ChatGPT Prompt (Copy & Paste):

```
I need you to generate a JSON file for uploading a SINGLE Bible chapter to my Prayer Bible app.

Use this EXACT structure and follow ALL the rules:

{
  "project": "Prayer Bible Project",
  "version": "1.0",
  "languages": ["english", "luganda"],
  "book": {
    "name_english": "[BOOK NAME]",
    "name_luganda": "[LUGANDA NAME]",
    "book_introduction": {
      "en_introduction": "[English intro about the book]",
      "lu_introduction": "[Luganda intro about the book]"
    },
    "book_prayer": {
      "en_prayer": "[Prayer related to the book]",
      "lu_prayer": "[Luganda prayer]"
    }
  },
  "chapters": [
    {
      "chapter_number": [CHAPTER NUMBER],
      "en_chapter_introduction": "[Intro for this chapter]",
      "lu_chapter_introduction": "[Luganda intro]",
      "en_chapter_prayer": "[Prayer for this chapter]",
      "lu_chapter_prayer": "[Luganda prayer]",
      "outlines": [
        {
          "en_title": "[Section title]",
          "lu_title": "[Luganda title]",
          "en_content": "I. Main Point\n   A. Sub-point\nII. Another Point\n   A. Sub-point",
          "lu_content": "[Luganda outline]",
          "order_index": 1
        }
      ],
      "verses": [
        {
          "verse_number": 1,
          "text_english": "[English Bible verse text]",
          "text_luganda": "[Luganda translation]",
          "en_commentary": "[Brief explanation of the verse]",
          "lu_commentary": "[Luganda commentary]",
          "cross_references": [
            {
              "book_id": [NUMBER],
              "book_name": "[Book Name]",
              "chapter": [CHAPTER],
              "verse": [VERSE],
              "relationship_type": "related|parallel|fulfillment|prophecy|quote|reference",
              "notes": "[Why this verse is related]"
            }
          ]
        }
      ]
    }
  ]
}

BOOK ID REFERENCE (CRITICAL):
Genesis=1, Exodus=2, Leviticus=3, Numbers=4, Deuteronomy=5, Joshua=6, Judges=7, Ruth=8, 1 Samuel=9, 2 Samuel=10, 1 Kings=11, 2 Kings=12, 1 Chronicles=13, 2 Chronicles=14, Ezra=15, Nehemiah=16, Esther=17, Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, Isaiah=22, Jeremiah=23, Lamentations=24, Ezekiel=25, Daniel=26, Hosea=27, Joel=28, Amos=29, Obadiah=30, Jonah=31, Micah=32, Nahum=33, Habakkuk=34, Zephaniah=35, Haggai=36, Zechariah=37, Malachi=38, Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1 Corinthians=46, 2 Corinthians=47, Galatians=48, Ephesians=49, Philippians=50, Colossians=51, 1 Thessalonians=52, 2 Thessalonians=53, 1 Timothy=54, 2 Timothy=55, Titus=56, Philemon=57, Hebrews=58, James=59, 1 Peter=60, 2 Peter=61, 1 John=62, 2 John=63, 3 John=64, Jude=65, Revelation=66

INSTRUCTIONS:

1. Replace [BOOK NAME] with the specific book (e.g., "Matthew", "John", "Genesis")
2. Replace [CHAPTER NUMBER] with the specific chapter number
3. For EACH VERSE in that chapter:
   - Include verse_number (1, 2, 3...)
   - Include text_english (English Bible text)
   - Include text_luganda (Luganda translation - use reasonable translation if exact not available)
   - Include en_commentary (brief explanation)
   - Include lu_commentary (Luganda commentary)
   - Include cross_references ONLY if the verse references other passages
4. Keep outlines 2-3 main sections per chapter
5. Keep cross-references MEANINGFUL and ACCURATE (don't add random references)
6. relationship_type options:
   - "related": Similar topic or concept
   - "parallel": Parallel account or similar story
   - "fulfillment": Prophecy fulfillment
   - "prophecy": Prophetic reference
   - "quote": Direct quote
   - "reference": General reference

IMPORTANT: Generate ONLY ONE chapter at a time. Include ALL verses in that chapter.

Generate complete JSON for [BOOK NAME], Chapter [CHAPTER NUMBER].
```

---

## Option 2: FULL BOOK Upload (Use if uploading entire book at once)

Use this when you want to upload an **ENTIRE BOOK WITH ALL CHAPTERS** in one go.

[Use FULL_JSON_TEMPLATE_WITH_CROSS_REFERENCES.json prompt]

---

## How to Use These Prompts:

### Step 1: Prepare Your Prompt
```
Copy the prompt above and replace:
- [BOOK NAME] → e.g., "Matthew"
- [CHAPTER NUMBER] → e.g., "1"
- [LUGANDA NAME] → e.g., "Matteyо"
```

### Step 2: Send to ChatGPT
1. Go to ChatGPT
2. Paste the entire prompt
3. Wait for the JSON response

### Step 3: Upload to Your App
1. Go to Admin Panel → Bible Management → Bulk Import
2. Paste the JSON output
3. Click "Upload" button
4. Wait for confirmation

### Step 4: Verify the Upload
1. Go to Bible Reader
2. Select the book and chapter
3. Confirm verses, commentaries, and cross-references are visible

---

## Tips for Better Results:

✅ **DO:**
- Use reliable Bible translations for text
- Keep commentaries brief (1-2 sentences)
- Link verses that actually relate to each other
- Include Luganda translations for completeness
- Test with one chapter first before doing whole book

❌ **DON'T:**
- Add random cross-references
- Include HTML formatting (just plain text)
- Mix different Bible versions within one chapter
- Upload duplicate chapters
- Use inconsistent names (e.g., "Matthew" vs "Matt")

---

## Example Cross-Reference Relationship Types:

| Type | Example | When to Use |
|------|---------|------------|
| `related` | John 3:16 → Romans 10:9 | Similar concept about salvation |
| `parallel` | Matthew 5:1-12 → Luke 6:20-26 | Same event in multiple gospels |
| `fulfillment` | Isaiah 53:5 → 1 Peter 2:24 | OT prophecy fulfilled in NT |
| `prophecy` | Daniel 9:25 → Matthew 24:30 | Forward-looking prophecy |
| `quote` | Matthew 4:4 → Deuteronomy 8:3 | Direct quote from scripture |
| `reference` | Any general related verse | General mention or allusion |

---

## Expected Upload Time:

- **Single Chapter**: < 2 seconds
- **Full Book (60+ chapters)**: 10-30 seconds
- **Multiple Books**: Depends on total chapters

The app will load instantly even with all this data because of smart caching and lazy-loading of cross-references.
