// app/utils/offlineReader.ts — OFFLINE-FIRST READERS
// Reads what DownloadManager V5 saved in IndexedDB.
// Used by Bible Reader when navigator.onLine === false (or fetch fails).
// No network calls here at all.
import { getAllFromStore, getBooks } from './offlineStorage';

export async function getOfflineBooks(): Promise<any[]> {
  const books = await getBooks();
  // offlineStorage saves bible_books rows with id/book_number/name_english/name_luganda
  return (books||[]).sort((a:any,b:any)=>(a.book_number??a.id)-(b.book_number??b.id));
}
export async function getOfflineChapter(bookId:number, chapter:number): Promise<any[]> {
  const verses = await getAllFromStore('verses');
  const list = (verses||[]).filter((v:any)=> Number(v.book_id)===Number(bookId) && Number(v.chapter)===Number(chapter));
  return list.sort((a:any,b:any)=> Number(a.verse)-Number(b.verse));
}
export async function getOfflineChapterIntro(bookId:number, chapter:number): Promise<any|null> {
  const all = await getAllFromStore('commentary');
  // chapter_introductions were saved as commentary with _table='chapter_introductions'
  const hit = (all||[]).find((c:any)=> c._table==='chapter_introductions' && Number(c.book_id)===Number(bookId) && Number(c.chapter)===Number(chapter));
  return hit || null;
}
export async function getOfflinePrayRead(bookId:number, chapter:number, verse:number): Promise<any|null> {
  const all = await getAllFromStore('commentary');
  return (all||[]).find((c:any)=> c._table==='verse_pray_read' && Number(c.book_id)===Number(bookId) && Number(c.chapter)===Number(chapter) && Number(c.verse)===Number(verse)) || null;
}
export async function getOfflineCrossRefs(bookId:number, chapter:number, verse:number): Promise<any[]> {
  const all = await getAllFromStore('commentary');
  // cross_references rows have various shapes — match loosely
  return (all||[]).filter((c:any)=> c._table==='cross_references' && (Number(c.book_id)===Number(bookId) || Number(c.from_book_id)===Number(bookId)) && (Number(c.chapter)===Number(chapter) || Number(c.from_chapter)===Number(chapter)));
}
export async function hasOfflineData(): Promise<boolean> {
  const books = await getBooks();
  return (books||[]).length>0;
}
export async function isOffline(): Promise<boolean> {
  if(typeof navigator==='undefined') return false;
  if(!navigator.onLine) return true;
  return false;
}
