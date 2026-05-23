'use client';

import { useEffect } from 'react';
import { ScriptureRef, useScripturePopup, ScriptureVersePopup } from '@/components/ScriptureVersePopup';

/**
 * Global click handler for scripture references.
 * Attaches to document and listens for clicks on any element with data-scripture-ref or data-verse-id.
 * Opens the scripture verse popup when clicked.
 */
export default function GlobalScriptureClickHandler() {
  const { popup, openVerse, closePopup } = useScripturePopup();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked element or any parent has data-scripture-ref or data-verse-id
      const scriptureBtn = target.closest('[data-scripture-ref]');
      const verseElement = target.closest('[data-verse-id]');
      
      if (scriptureBtn) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const refData = scriptureBtn.getAttribute('data-scripture-ref');
          if (refData) {
            const ref: ScriptureRef = JSON.parse(decodeURIComponent(refData));
            openVerse(ref);
          }
        } catch (err) {
          console.error('Failed to parse scripture reference:', err);
        }
      } else if (verseElement) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const verseId = verseElement.getAttribute('data-verse-id');
          const bookName = verseElement.getAttribute('data-book-name');
          const chapterNum = verseElement.getAttribute('data-chapter');
          
          if (verseId && bookName && chapterNum) {
            const ref: ScriptureRef = {
              book: bookName,
              chapter: parseInt(chapterNum),
              verse: parseInt(verseId),
              display: `${bookName} ${chapterNum}:${verseId}`,
            };
            openVerse(ref);
          }
        } catch (err) {
          console.error('Failed to parse verse data:', err);
        }
      }
    };

    // Attach listener to document for event delegation
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [openVerse]);

  // Render the popup
  return <ScriptureVersePopup popup={popup} onClose={closePopup} />;
}
