'use client';

import { useState, useEffect } from 'react';
import { Book, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface CrossReference {
  id: number;
  target_book_id: number;
  target_book_number: number;
  target_chapter: number;
  target_verse: number;
  target_book_name: string;
  target_book_name_luganda: string;
  text_english: string;
  text_luganda: string;
  relationship_type: string;
  notes: string;
}

interface CrossReferencesProps {
  bookId: number;
  chapter: number;
  verse: number;
  language: 'en' | 'lu';
}

export default function CrossReferences({ bookId, chapter, verse, language }: CrossReferencesProps) {
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchCrossReferences();
  }, [bookId, chapter, verse]);

  const fetchCrossReferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/cross-references?bookId=${bookId}&chapter=${chapter}&verse=${verse}`
      );
      const data = await response.json();
      setCrossRefs(data.crossReferences || []);
    } catch (error) {
      console.error('Error fetching cross-references:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (crossRefs.length === 0) {
    return null;
  }

  const relationshipLabels: Record<string, { en: string; lu: string }> = {
    parallel: { en: 'Parallel passage', lu: 'Ekitundu ekifaananako' },
    prophecy_fulfillment: { en: 'Prophecy fulfillment', lu: 'Okutuukiriza obunnabbi' },
    quotation: { en: 'Direct quotation', lu: 'Okweyoleka butereevu' },
    related: { en: 'Related passage', lu: 'Ekitundu ekikwatagana' },
    contrast: { en: 'Contrasting passage', lu: 'Ekitundu ekikyawaanako' }
  };

  return (
    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-300 w-full"
      >
        <Book className="w-4 h-4" />
        <span>
          {language === 'en' ? 'Cross References' : 'Ebikyusibwamu'}
        </span>
        <span className="bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded-full text-xs ml-auto">
          {crossRefs.length}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {crossRefs.map((ref) => {
            const bookName = language === 'en' ? ref.target_book_name : ref.target_book_name_luganda;
            const verseText = language === 'en' ? ref.text_english : ref.text_luganda;
            const relationshipLabel = relationshipLabels[ref.relationship_type]?.[language] || 
              (language === 'en' ? 'Related passage' : 'Ekitundu ekikwatagana');

            return (
              <div key={ref.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-100 dark:border-purple-700">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    href={`/bible-reader/${ref.target_book_number}/${ref.target_chapter}`}
                    className="font-medium text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 flex items-center gap-1"
                  >
                    {bookName} {ref.target_chapter}:{ref.target_verse}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                    {relationshipLabel}
                  </span>
                </div>
                
                {verseText && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {verseText}
                  </p>
                )}

                {ref.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    {ref.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
