# VerseSelector Component - Implementation Guide

## Overview
`VerseSelector` is a reusable component that consolidates the "Select Book & Chapter" and "Find & Edit Verses" sections from the admin panel. It eliminates 33+ lines of duplicated JSX code and provides a flexible, configurable interface for verse selection.

## Component Location
```
/app/components/VerseSelector.tsx
```

## Props Reference

### Required Props
| Prop | Type | Description |
|------|------|-------------|
| `selectedBook` | `string` | Currently selected book name |
| `selectedChapter` | `string` | Currently selected chapter number |
| `selectedVerse` | `string` | Currently selected verse number |
| `onBookChange` | `(value: string) => void` | Callback when book is changed |
| `onChapterChange` | `(value: string) => void` | Callback when chapter is changed |
| `onVerseChange` | `(value: string) => void` | Callback when verse is changed |
| `books` | `Book[]` | Array of books with `id` and `name` properties |

### Optional Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridCols` | `number` | `3` | Grid columns: 2, 3, or 4 |
| `optionalVerse` | `boolean` | `false` | Makes verse selection optional |
| `showSearchButton` | `boolean` | `false` | Shows/hides search button |
| `focusRing` | `boolean` | `false` | Adds focus ring styling to inputs |
| `onSearch` | `() => void` | `undefined` | Callback for search button click |
| `isSearching` | `boolean` | `false` | Shows loading state on search button |

## Usage Examples

### Example 1: Simple Book/Chapter/Verse Selector
Used in "Select Book & Chapter" section with 3-column layout:

```tsx
import VerseSelector from '../components/VerseSelector';

export default function AdminPanel() {
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [books, setBooks] = useState<Book[]>([]);

  return (
    <VerseSelector
      selectedBook={selectedBook}
      selectedChapter={chapter}
      selectedVerse={verseNumber}
      onBookChange={setSelectedBook}
      onChapterChange={setChapter}
      onVerseChange={setVerseNumber}
      books={books}
      gridCols={3}
      focusRing={true}
    />
  );
}
```

### Example 2: Search-Enabled Verse Finder
Used in "Find & Edit Verses" section with 4-column layout and search button:

```tsx
<VerseSelector
  selectedBook={filterBook}
  selectedChapter={filterChapter}
  selectedVerse={filterVerse}
  onBookChange={setFilterBook}
  onChapterChange={setFilterChapter}
  onVerseChange={setFilterVerse}
  books={books}
  gridCols={4}
  optionalVerse={true}
  showSearchButton={true}
  onSearch={fetchFilteredVerses}
  isSearching={false}
  focusRing={true}
/>
```

### Example 3: Minimal Configuration
Using all defaults (3 columns, required verse, no search button):

```tsx
<VerseSelector
  selectedBook={selectedBook}
  selectedChapter={chapter}
  selectedVerse={verse}
  onBookChange={setSelectedBook}
  onChapterChange={setChapter}
  onVerseChange={setVerse}
  books={books}
/>
```

## Migration Path

### Step 1: Replace "Select Book & Chapter" Section
**Before (33 lines):**
```tsx
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h3 className="text-xl font-bold text-gray-800 mb-4">Select Book & Chapter</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
      <select
        value={selectedBook}
        onChange={(e) => {
          setSelectedBook(e.target.value);
          setChapter('');
          setVerseNumber('');
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">-- Select a book --</option>
        {books.map((book) => (
          <option key={book.id} value={book.name}>{book.name}</option>
        ))}
      </select>
    </div>
    {/* Chapter input... */}
    {/* Verse input... */}
  </div>
</div>
```

**After (1 line):**
```tsx
<VerseSelector
  selectedBook={selectedBook}
  selectedChapter={chapter}
  selectedVerse={verseNumber}
  onBookChange={setSelectedBook}
  onChapterChange={setChapter}
  onVerseChange={setVerseNumber}
  books={books}
  focusRing={true}
/>
```

### Step 2: Replace "Find & Edit Verses" Section
**Before (40 lines):**
```tsx
<div className="bg-white rounded-lg shadow p-6 mb-6 mt-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 Find & Edit Verses</h2>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
    {/* Book dropdown... */}
    {/* Chapter input... */}
    {/* Verse input (optional)... */}
    <div className="flex items-end">
      <button
        onClick={fetchFilteredVerses}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold"
      >
        Search
      </button>
    </div>
  </div>
</div>
```

**After (1 component):**
```tsx
<VerseSelector
  selectedBook={filterBook}
  selectedChapter={filterChapter}
  selectedVerse={filterVerse}
  onBookChange={setFilterBook}
  onChapterChange={setFilterChapter}
  onVerseChange={setFilterVerse}
  books={books}
  gridCols={4}
  optionalVerse={true}
  showSearchButton={true}
  onSearch={fetchFilteredVerses}
  focusRing={true}
/>
```

## Benefits

✅ **Eliminates Duplication** — 33+ lines of identical JSX consolidated into reusable component

✅ **Single Source of Truth** — Changes to input styling apply everywhere

✅ **Flexible Configuration** — Props enable different layouts/behaviors without code duplication

✅ **Easy Maintenance** — Update component in one place, fixes all implementations

✅ **Consistent UX** — Identical behavior and styling across all verse selection instances

✅ **Reusable Elsewhere** — Can be used in Bible reader, discussion groups, settings, etc.

## CSS Classes Used

- `bg-white rounded-lg shadow p-6 mb-6` — Container styling
- `grid grid-cols-1 {md:grid-cols-X} gap-4` — Responsive grid (2, 3, or 4 columns)
- `w-full px-3 py-2 border border-gray-300 rounded-lg` — Input base styling
- `focus:ring-2 focus:ring-blue-500` — Focus ring (conditional)
- `bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400` — Button styling

## Next Steps

1. **Import the component** in `/app/admin-panel/page.tsx`
2. **Replace the "Select Book & Chapter" section** with VerseSelector (3-column layout)
3. **Replace the "Find & Edit Verses" section** with VerseSelector (4-column layout with search)
4. **Test both sections** to ensure functionality is identical
5. **Remove old code** after verification

## Testing Checklist

- [ ] Book dropdown loads and filters correctly
- [ ] Chapter input accepts numeric values
- [ ] Verse input accepts numeric values (or stays empty if optional)
- [ ] Book change clears chapter/verse
- [ ] Search button appears only when configured
- [ ] Search button is disabled without book/chapter
- [ ] Focus ring appears when enabled
- [ ] Component responds to all prop changes
- [ ] Grid layout adjusts for different `gridCols` values

## Performance Notes

- Component is lightweight (no expensive re-renders)
- Uses standard controlled React inputs
- No API calls (parent component handles data fetching)
- No side effects beyond state updates
- Memoization optional if used with multiple instances

## Accessibility

- Proper `<label>` elements for all inputs
- Semantic `<select>` for book dropdown
- Clear placeholder text
- Sufficient contrast ratios
- Keyboard navigable
- Optional verse field clearly marked

---

**Estimated Time to Implement:** 30 minutes
**Files to Modify:** 1 (`/app/admin-panel/page.tsx`)
**Lines of Code Eliminated:** 33+
**Maintainability Gain:** 🔥 High
