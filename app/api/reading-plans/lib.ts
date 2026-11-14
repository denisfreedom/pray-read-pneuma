// app/api/reading-plans/lib.ts — shared by the list route, detail route and
// progress route so every surface agrees on the same plans, days and books.
export const BOOK_NAMES: Record<number, string> = {
  1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
  6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles',
  15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
  20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah',
  24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel', 28: 'Hosea',
  29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah', 33: 'Micah',
  34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah', 37: 'Haggai', 38: 'Zechariah',
  39: 'Malachi', 40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John',
  44: 'Acts', 45: 'Romans', 46: '1 Corinthians', 47: '2 Corinthians',
  48: 'Galatians', 49: 'Ephesians', 50: 'Philippians', 51: 'Colossians',
  52: '1 Thessalonians', 53: '2 Thessalonians', 54: '1 Timothy', 55: '2 Timothy',
  56: 'Titus', 57: 'Philemon', 58: 'Hebrews', 59: 'James', 60: '1 Peter',
  61: '2 Peter', 62: '1 John', 63: '2 John', 64: '3 John', 65: 'Jude',
  66: 'Revelation',
};

export const CHAPTER_COUNTS: Record<number, number> = {
  1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
  11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150,
  20: 31, 21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14,
  29: 3, 30: 9, 31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14,
  39: 4, 40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13,
  48: 6, 49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1,
  58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22,
};

export type BuiltinPlan = {
  id: number; title: string; description: string; duration_days: number;
  icon: string; day_count: number; first_book: string; first_book_number: number;
  books: number[]; builtin: true;
};

export const BUILTIN_PLANS: BuiltinPlan[] = [
  { id: 1001, title: 'The Whole Bible in a Year', description: 'The full story of Scripture, Genesis to Revelation — a steady chapter-a-day rhythm that takes you through the whole Bible in one year.', duration_days: 365, icon: '📖', day_count: 365, first_book: 'Genesis', first_book_number: 1, books: Array.from({ length: 66 }, (_, i) => i + 1), builtin: true },
  { id: 1002, title: 'New Testament in 90 Days', description: 'From Matthew to Revelation in three focused months. A faster pace for a season when you want the whole New Testament fresh in your mind.', duration_days: 90, icon: '📘', day_count: 90, first_book: 'Matthew', first_book_number: 40, books: Array.from({ length: 27 }, (_, i) => 40 + i), builtin: true },
  { id: 1003, title: 'Psalms in 30 Days', description: 'One month in the prayer book of the Bible — praise, lament, thanksgiving and trust, a psalm a day for thirty days.', duration_days: 30, icon: '🎵', day_count: 30, first_book: 'Psalms', first_book_number: 19, books: [19], builtin: true },
  { id: 1004, title: 'Proverbs: 31 Days of Wisdom', description: 'A chapter of Proverbs a day for a month — practical wisdom for work, family, money and speech.', duration_days: 31, icon: '💡', day_count: 31, first_book: 'Proverbs', first_book_number: 20, books: [20], builtin: true },
  { id: 1005, title: 'The Gospels in 60 Days', description: 'Matthew, Mark, Luke and John in two months — the life, teaching, death and resurrection of Jesus, four times over.', duration_days: 60, icon: '✝️', day_count: 60, first_book: 'Matthew', first_book_number: 40, books: [40, 41, 42, 43], builtin: true },
  { id: 1006, title: 'Genesis: Beginnings in 30 Days', description: 'Creation, the fall, Abraham, Jacob and Joseph — the foundations of the whole story in one month.', duration_days: 30, icon: '🌅', day_count: 30, first_book: 'Genesis', first_book_number: 1, books: [1], builtin: true },
  { id: 1007, title: 'Romans in 16 Days', description: 'One chapter a day through Paul’s great letter — sin, grace, faith, and life in the Spirit.', duration_days: 16, icon: '✉️', day_count: 16, first_book: 'Romans', first_book_number: 45, books: [45], builtin: true },
  { id: 1008, title: 'John in 21 Days', description: 'Three weeks in the Gospel of John — who Jesus is, in his own words and works.', duration_days: 21, icon: '❤️', day_count: 21, first_book: 'John', first_book_number: 43, books: [43], builtin: true },
];

export function getBuiltinPlan(id: number): BuiltinPlan | undefined {
  return BUILTIN_PLANS.find((p) => p.id === id);
}

export type DayReading = { book_number: number; book_name: string; chapter: number };
export type PlanDay = { day_number: number; readings: DayReading[]; label: string };

// Split a plan's books' chapters evenly across its days — every chapter appears
// exactly once, every day is non-empty. Day N of "Romans in 16 Days" is Romans N.
export function getPlanDays(plan: { duration_days: number; books?: number[] }): PlanDay[] {
  const books = plan.books && plan.books.length ? plan.books : [];
  const totalDays = Math.max(1, plan.duration_days || 1);
  if (!books.length) {
    return Array.from({ length: totalDays }, (_, i) => ({ day_number: i + 1, readings: [], label: `Day ${i + 1}` }));
  }
  const flat: DayReading[] = [];
  for (const b of books) {
    const count = CHAPTER_COUNTS[b] || 0;
    for (let c = 1; c <= count; c++) flat.push({ book_number: b, book_name: BOOK_NAMES[b] || `Book ${b}`, chapter: c });
  }
  const base = Math.floor(flat.length / totalDays);
  const rem = flat.length % totalDays;
  const days: PlanDay[] = [];
  let cursor = 0;
  for (let d = 1; d <= totalDays; d++) {
    const take = base + (d <= rem ? 1 : 0);
    const slice = flat.slice(cursor, cursor + Math.max(take, 1));
    cursor += slice.length;
    days.push({ day_number: d, readings: slice, label: dayLabel(slice) });
    if (cursor >= flat.length) {
      // Fewer chapters than days (should not happen for built-ins) — pad empty days
      for (let r = d + 1; r <= totalDays; r++) days.push({ day_number: r, readings: [], label: `Day ${r}` });
      break;
    }
  }
  return days;
}

function dayLabel(readings: DayReading[]): string {
  if (!readings.length) return '';
  const byBook = new Map<number, number[]>();
  for (const r of readings) {
    if (!byBook.has(r.book_number)) byBook.set(r.book_number, []);
    byBook.get(r.book_number)!.push(r.chapter);
  }
  const parts: string[] = [];
  for (const [b, chapters] of byBook) {
    const name = BOOK_NAMES[b] || `Book ${b}`;
    const first = chapters[0];
    const last = chapters[chapters.length - 1];
    parts.push(first === last ? `${name} ${first}` : `${name} ${first}–${last}`);
  }
  return parts.join(' · ');
}

export type FinishedBook = { book_number: number; book_name: string; finished_at: string | null };

// A book is finished when EVERY day that contains any of its chapters is marked
// complete. finished_at = the latest completed_at among those days.
export function getFinishedBooks(days: PlanDay[], completedAt: Map<number, string>): FinishedBook[] {
  const books = new Map<number, { days: number[] }>();
  for (const d of days) {
    for (const r of d.readings) {
      if (!books.has(r.book_number)) books.set(r.book_number, { days: [] });
      if (!books.get(r.book_number)!.days.includes(d.day_number)) books.get(r.book_number)!.days.push(d.day_number);
    }
  }
  const out: FinishedBook[] = [];
  for (const [b, info] of books) {
    if (!info.days.length) continue;
    if (info.days.every((dn) => completedAt.has(dn))) {
      const latest = info.days.map((dn) => completedAt.get(dn)!).sort().pop() || null;
      out.push({ book_number: b, book_name: BOOK_NAMES[b] || `Book ${b}`, finished_at: latest });
    }
  }
  return out.sort((a, b) => a.book_number - b.book_number);
}
