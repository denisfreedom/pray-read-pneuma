# Bible Bulk Import JSON Format Guide

## Overview
This guide explains the JSON format for bulk importing Bible books, chapters, verses, and related content (introductions, prayers, outlines, commentaries, and cross-references).

## Complete Example

```json
{
  "project": "Prayer Bible Project",
  "version": "1.0",
  "languages": ["english", "luganda"],
  "book": {
    "name_english": "Ruth",
    "name_luganda": "Luusi",
    "book_introduction": {
      "text_english": "Ruth is a beautiful story of...",
      "text_luganda": "Luusi nkwanirira ensi...",
      "audio_url": "https://example.com/ruth-intro.mp3"
    },
    "general_concluding_prayer_for_entire_book": {
      "text_english": "Father, thank you for the story of Ruth...",
      "text_luganda": "Kitaffe, webasidde ku musota gwa Luusi..."
    },
    "chapters": [
      {
        "chapter": 1,
        "chapter_introduction": {
          "text_english": "Ruth's arrival in Bethlehem...",
          "text_luganda": "Okukoma kwa Luusi...",
          "audio_url": "https://example.com/ruth-ch1-intro.mp3"
        },
        "closing_general_chapter_prayer": {
          "text_english": "Lord, help us understand...",
          "text_luganda": "Mukama, tutegeeze..."
        },
        "verses": [
          {
            "verse": 1,
            "scripture": {
              "text_english": "In the days when the judges ruled, there was a famine in the land...",
              "text_luganda": "Mu nnyo ezo ezali empokezi... mu nsi..."
            },
            "prayer": {
              "text_english": "Thank you for Your provision...",
              "text_luganda": "Webasidde ku....."
            },
            "cross_references": [
              "Judges 2:16",
              "1 Samuel 1:1",
              "2 Chronicles 26:1"
            ]
          },
          {
            "verse": 2,
            "scripture": {
              "text_english": "And Elimelech, Naomi's husband, died...",
              "text_luganda": "Elimuleeki, omusajja wa Naomi, akufa..."
            }
          }
        ]
      },
      {
        "chapter": 2,
        "verses": [
          {
            "verse": 1,
            "scripture": {
              "text_english": "Now Naomi had a kinsman on her husband's side...",
              "text_luganda": "Naomi yalina omuntu wo mu kaggo..."
            },
            "cross_references": [
              "Ruth 3:2",
              "Ruth 4:1"
            ]
          }
        ]
      }
    ]
  }
}
```

## Field Descriptions

### Root Level
- **project**: Project name (optional)
- **version**: Version number (optional)
- **languages**: Array of languages included ["english", "luganda"]
- **book**: Book object containing all chapter and verse data

### Book Object
- **name_english**: English name of the book (required)
- **name_luganda**: Luganda name of the book (required)
- **book_introduction**: (Optional) Introduction for the entire book
  - **text_english**: English introduction text
  - **text_luganda**: Luganda introduction text
  - **audio_url**: URL to audio for the introduction
- **general_concluding_prayer_for_entire_book**: (Optional) Closing prayer for the book
  - **text_english**: English prayer text
  - **text_luganda**: Luganda prayer text
- **chapters**: Array of chapter objects

### Chapter Object
- **chapter**: Chapter number (required)
- **chapter_introduction**: (Optional) Introduction for this chapter
  - **text_english**: English introduction text
  - **text_luganda**: Luganda introduction text
  - **audio_url**: URL to audio for the introduction
- **closing_general_chapter_prayer**: (Optional) Closing prayer for this chapter
  - **text_english**: English prayer text
  - **text_luganda**: Luganda prayer text
- **verses**: Array of verse objects

### Verse Object
- **verse**: Verse number (required)
- **scripture**: (Required) The actual scripture text
  - **text_english**: English scripture text
  - **text_luganda**: Luganda scripture text
- **prayer**: (Optional) Prayer associated with this verse
  - **text_english**: English prayer
  - **text_luganda**: Luganda prayer
- **cross_references**: (Optional) Array of cross-reference verses
  - Format: `"BookName Chapter:Verse"` (e.g., `"John 3:16"`, `"Genesis 1:1"`)
  - Multiple cross-references can be listed
  - References should match existing book names in your database

## Cross-References Details

### What are Cross-References?
Cross-references link a verse to other related passages in the Bible. They help readers explore related topics and themes.

### Format
```
"cross_references": [
  "John 3:16",
  "Romans 10:9",
  "1 Timothy 2:4"
]
```

### Types of Cross-References
When you see these in the Bible reader, they are categorized as:
- **related**: General topical connection
- **parallel**: Similar story or passage
- **fulfillment**: Prophecy fulfilled
- **prophecy**: Prophecy being stated
- **quote**: Direct or indirect quote
- **reference**: General reference

*Note: The type is set to "related" by default during bulk import. You can edit specific cross-references in the Admin Panel > Cross-References to change the type.*

### How Cross-References Appear
When reading a verse with cross-references in the app:
1. A "Related Passages" section appears below the verse
2. Each cross-reference shows:
   - Book, Chapter, and Verse reference (clickable link)
   - Type badge (related, parallel, fulfillment, etc.)
   - Preview of the referenced scripture
3. Click any cross-reference to jump to that verse

## Validation Rules

### Required Fields
- Book name (English)
- Chapter number
- Verse number
- Scripture text (at least one language)

### Optional Fields
- Book introduction with audio
- Chapter introduction with audio
- Prayers (book-level and chapter-level)
- Cross-references
- Notes and commentaries (added separately)

### Important Notes
1. **Book Name Matching**: Cross-reference book names must match existing books in the database
2. **Audio URLs**: Must be valid, accessible URLs
3. **Languages**: Can be English, Luganda, or both
4. **Verse Format**: Verse numbers should be sequential integers

## Updating Existing Content

When you upload the same book/chapter/verses with this JSON format:
- **Verses will be UPDATED** if they already exist (same book, chapter, verse number)
- **New verses will be INSERTED** if they don't exist
- **Cross-references will be added** to the database

## Tips for Success

1. **Validate JSON**: Use a JSON validator before uploading
2. **Test with small files**: Start with one chapter before uploading the entire book
3. **Use consistent book names**: Match the exact spelling of book names in cross-references
4. **Include audio URLs**: Optional but recommended for better user experience
5. **Provide both languages**: When possible, include both English and Luganda text

## Admin Panel Management

After bulk import, you can:
1. **View Verses**: Admin Panel → View Verses
2. **Edit Cross-References**: Admin Panel → Cpanel Cross-References
3. **Add Commentaries**: Admin Panel → Cpanel Commentary
4. **Manage Introductions**: Via the verse editor

## Support

For more information or issues with bulk import:
1. Check the browser console for detailed error messages
2. Use the Admin Panel's built-in tools to verify and edit content
3. Test cross-references in the Bible Reader to ensure they work correctly
