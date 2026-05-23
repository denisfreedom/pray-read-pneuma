'use client';

import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useScripturePopup, ScriptureVersePopup, ScriptureHtml } from '@/components/ScriptureVersePopup';

interface TheologicalInsight {
  id?: number;
  book_id: number;
  chapter?: number;
  verse_number?: number;
  english_insight: string;
  luganda_insight: string;
}

interface TheologicalInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'book' | 'chapter' | 'verse';
  bookId: number;
  bookName?: string;
  chapter?: number;
  verseNumber?: number;
  theme?: 'light' | 'sepia' | 'dark';
  language?: 'english' | 'luganda' | 'both';
}

export default function TheologicalInsightsModal({
  isOpen,
  onClose,
  mode,
  bookId,
  bookName = '',
  chapter,
  verseNumber,
  theme = 'light',
  language = 'english',
}: TheologicalInsightsModalProps) {
  const [insights, setInsights] = useState<TheologicalInsight | TheologicalInsight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { popup, openVerse, closePopup } = useScripturePopup();

  useEffect(() => {
    if (!isOpen || !bookId) return;
    setInsights(null);
    setError('');
    setLoading(true);

    const fetchData = async () => {
      try {
        let url = '';
        if (mode === 'book') {
          url = `/api/book-theological-insights?book_id=${bookId}`;
        } else if (mode === 'chapter' && chapter !== undefined) {
          url = `/api/verse-theological-insights?bookId=${bookId}&chapter=${chapter}`;
        } else if (mode === 'verse' && chapter !== undefined && verseNumber !== undefined) {
          url = `/api/verse-theological-insights?bookId=${bookId}&chapter=${chapter}&verseNumber=${verseNumber}`;
        }

        if (!url) { setLoading(false); return; }

        const res = await fetch(url);
        const data = await res.json();
        setInsights(data || null);
      } catch {
        setError('Failed to load theological insights');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, mode, bookId, chapter, verseNumber]);

  if (!isOpen) return null;

  // Theme classes
  const modalBg = theme === 'dark' ? 'bg-gray-800/95' : theme === 'sepia' ? 'bg-blue-50/95' : 'bg-white/95';
  const borderCls = theme === 'dark' ? 'border-gray-700' : theme === 'sepia' ? 'border-blue-300' : 'border-gray-200';
  const textCls = theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? 'text-blue-900' : 'text-gray-900';
  const subTextCls = theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-blue-700' : 'text-gray-500';
  const cardBg = theme === 'dark' ? 'bg-purple-900/30 border-purple-700' : theme === 'sepia' ? 'bg-blue-100/50 border-blue-300' : 'bg-purple-50/50 border-purple-200';
  const closeBg = theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : theme === 'sepia' ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-100 hover:bg-gray-200';

  const titleLabel = mode === 'book'
    ? `📖 ${bookName} — Book Theological Insights`
    : mode === 'chapter'
    ? `💡 ${bookName} Chapter ${chapter} — Theological Insights`
    : `💡 ${bookName} ${chapter}:${verseNumber} — Theological Insight`;

  const renderInsightContent = (insight: TheologicalInsight) => (
    <div className={`rounded-lg p-4 border ${cardBg} space-y-4`}>
      {(language === 'english' || language === 'both') && insight.english_insight && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-2">English</p>
          <ScriptureHtml html={insight.english_insight} onVerseClick={openVerse} className={`${textCls} leading-relaxed text-sm`} />
        </div>
      )}
      {language === 'both' && insight.english_insight && insight.luganda_insight && (
        <hr className={`border-t ${borderCls}`} />
      )}
      {(language === 'luganda' || language === 'both') && insight.luganda_insight && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-2">Luganda</p>
          <ScriptureHtml html={insight.luganda_insight} onVerseClick={openVerse} className={`${subTextCls} leading-relaxed text-sm`} />
        </div>
      )}
      {!insight.english_insight && !insight.luganda_insight && (
        <p className={`${subTextCls} italic`}>No theological insights available yet.</p>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) return (
      <div className={`p-10 text-center ${subTextCls}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3" />
        <p>Loading theological insights...</p>
      </div>
    );
    if (error) return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">❌ {error}</div>
    );

    // Verse or Book mode: single insight object
    if (mode === 'verse' || mode === 'book') {
      const single = insights as TheologicalInsight | null;
      if (!single || (!single.english_insight && !single.luganda_insight)) {
        return <p className={`italic text-center py-8 ${subTextCls}`}>No theological insights available yet.</p>;
      }
      return renderInsightContent(single);
    }

    // Chapter mode: array of verse insights
    if (mode === 'chapter') {
      const arr = insights as TheologicalInsight[] | null;
      if (!arr || arr.length === 0) {
        return <p className={`italic text-center py-8 ${subTextCls}`}>No theological insights added for this chapter yet.</p>;
      }
      return (
        <div className="space-y-4">
          {arr.map((ins, i) => (
            <div key={ins.id ?? i}>
              <p className={`text-xs font-bold mb-2 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                Verse {ins.verse_number}
              </p>
              {renderInsightContent(ins)}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${modalBg} border ${borderCls} rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-sm`}>
        {/* Header */}
        <div className={`border-b ${borderCls} p-5 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-bold leading-tight ${textCls}`}>{titleLabel}</h2>
              <p className={`text-xs ${subTextCls} capitalize`}>{mode}-level insights</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${closeBg} ml-3 flex-shrink-0`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className={`border-t ${borderCls} p-4 flex justify-end flex-shrink-0`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-lg font-semibold transition-colors ${
              theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
              : theme === 'sepia' ? 'bg-blue-200 hover:bg-blue-300 text-blue-900'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
      <ScriptureVersePopup popup={popup} onClose={closePopup} />
    </div>
  );
}
