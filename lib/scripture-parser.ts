// lib/scripture-parser.ts — recognises Gen 1:1, Genesis 1:1-3, I Cor. 12:12, Ps. 23:1, etc.
export type ScriptureRef={book:string;chapter:number;verseStart:number;verseEnd:number;raw:string;start:number;end:number};
const BOOKS:Record<string,string>={
"genesis":"Genesis","gen":"Genesis","ge":"Genesis","exodus":"Exodus","exo":"Exodus","ex":"Exodus",
"leviticus":"Leviticus","lev":"Leviticus","numbers":"Numbers","num":"Numbers","deuteronomy":"Deuteronomy","deut":"Deuteronomy","deu":"Deuteronomy",
"joshua":"Joshua","josh":"Joshua","judges":"Judges","judg":"Judges","ruth":"Ruth","1 samuel":"1 Samuel","1sam":"1 Samuel","1 sam":"1 Samuel",
"2 samuel":"2 Samuel","2sam":"2 Samuel","1 kings":"1 Kings","1kings":"1 Kings","2 kings":"2 Kings","1 chronicles":"1 Chronicles","1chron":"1 Chronicles",
"2 chronicles":"2 Chronicles","ezra":"Ezra","nehemiah":"Nehemiah","neh":"Nehemiah","esther":"Esther","job":"Job","psalm":"Psalm","psalms":"Psalm","ps":"Psalm","psa":"Psalm",
"proverbs":"Proverbs","prov":"Proverbs","ecclesiastes":"Ecclesiastes","eccl":"Ecclesiastes","song of solomon":"Song of Solomon","song":"Song of Solomon",
"isaiah":"Isaiah","isa":"Isaiah","jeremiah":"Jeremiah","jer":"Jeremiah","lamentations":"Lamentations","lam":"Lamentations","ezekiel":"Ezekiel","ezek":"Ezekiel",
"daniel":"Daniel","dan":"Daniel","hosea":"Hosea","joel":"Joel","amos":"Amos","obadiah":"Obadiah","jonah":"Jonah","micah":"Micah","nahum":"Nahum","habakkuk":"Habakkuk","zephaniah":"Zephaniah","haggai":"Haggai","zechariah":"Zechariah","zech":"Zechariah","malachi":"Malachi","mal":"Malachi",
"matthew":"Matthew","matt":"Matthew","mt":"Matthew","mark":"Mark","mk":"Mark","luke":"Luke","lk":"Luke","john":"John","jn":"John",
"acts":"Acts","romans":"Romans","rom":"Romans","1 corinthians":"1 Corinthians","1cor":"1 Corinthians","1 cor":"1 Corinthians","i cor":"1 Corinthians",
"2 corinthians":"2 Corinthians","2cor":"2 Corinthians","galatians":"Galatians","gal":"Galatians","ephesians":"Ephesians","eph":"Ephesians",
"philippians":"Philippians","phil":"Philippians","colossians":"Colossians","col":"Colossians","1 thessalonians":"1 Thessalonians","1thess":"1 Thessalonians",
"2 thessalonians":"2 Thessalonians","1 timothy":"1 Timothy","1tim":"1 Timothy","2 timothy":"2 Timothy","titus":"Titus","philemon":"Philemon","hebrews":"Hebrews","heb":"Hebrews",
"james":"James","jas":"James","1 peter":"1 Peter","1pet":"1 Peter","2 peter":"2 Peter","1 john":"1 John","2 john":"2 John","3 john":"3 John","jude":"Jude","revelation":"Revelation","rev":"Revelation",
};
const ROMAN:{[k:string]:string}={"i":"1","ii":"2","iii":"3"};
// Matches: [1|I ] Book [.] Chapter:Verse[-Verse]
const REF_RE=/\b((?:[1-3]\s?|I{1,3}\s)?[A-Za-z]+(?:\s+of\s+Solomon)?)\.?\s+(\d{1,3}):(\d{1,3})(?:\s*[\u2013\u2014\-\u2010]\s*(\d{1,3}))?/g;
export function parseScriptureRefs(text:string):ScriptureRef[]{
  const out:ScriptureRef[]=[]; let m;
  REF_RE.lastIndex=0;
  while((m=REF_RE.exec(text))!==null){
    let rawBook=m[1].trim().toLowerCase().replace(/\s+/g," ");
    // normalise roman numerals: "i cor" -> "1 cor"
    const parts=rawBook.split(" "); if(parts[0] in ROMAN) parts[0]=ROMAN[parts[0]];
    rawBook=parts.join(" ");
    const book=BOOKS[rawBook]; if(!book) continue;
    // Avoid matching ordinary words like "John 1" in a name — require verse part, already required.
    out.push({book,chapter:parseInt(m[2]),verseStart:parseInt(m[3]),verseEnd:m[4]?parseInt(m[4]):parseInt(m[3]),raw:m[0],start:m.index,end:m.index+m[0].length});
  }
  return out;
}
