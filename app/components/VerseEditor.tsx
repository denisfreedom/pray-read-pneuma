'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Minus, Plus, Type, X, Trash2 } from 'lucide-react';

// Allowed inline style properties — everything else is stripped on paste
const ALLOWED_STYLE_PROPS = new Set([
  'font-family', 'font-size', 'font-weight', 'font-style',
  'color', 'text-decoration', 'text-decoration-line',
]);

function sanitizePastedHtml(html: string): string {
  // Strip Word/browser junk at string level first
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '');

  const temp = document.createElement('div');
  temp.innerHTML = cleaned;

  const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT, null, false as any);
  const toRemove: Element[] = [];
  let node = walker.nextNode();

  while (node) {
    const el = node as Element;
    if (el.tagName?.includes(':')) { toRemove.push(el); node = walker.nextNode(); continue; }

    // Strip all attributes except style
    Array.from(el.attributes).forEach(attr => {
      if (attr.name !== 'style') el.removeAttribute(attr.name);
    });

    // Whitelist inline styles
    if (el.hasAttribute('style')) {
      const clean = (el.getAttribute('style') || '')
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false;
          const prop = s.split(':')[0].trim().toLowerCase();
          if (prop.startsWith('--')) return false;
          return ALLOWED_STYLE_PROPS.has(prop);
        })
        .join('; ');
      clean ? el.setAttribute('style', clean) : el.removeAttribute('style');
    }

    node = walker.nextNode();
  }

  toRemove.forEach(n => {
    if (n.parentNode) {
      while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
      n.parentNode.removeChild(n);
    }
  });

  return temp.innerHTML;
}

interface VerseStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
}

interface VerseEditorProps {
  bookId: number;
  chapter: number;
  verseNumber: number;
  englishText: string;
  lugandaText: string;
  verseId?: number;
  onClose: () => void;
  onSave: () => void;
}

export default function VerseEditor({
  bookId,
  chapter,
  verseNumber,
  englishText,
  lugandaText,
  verseId,
  onClose,
  onSave
}: VerseEditorProps) {
  // Null check on mount
  useEffect(() => {
    console.log('🔍 VerseEditor mounted with props:', { bookId, chapter, verseNumber, englishText: englishText?.substring(0, 50), lugandaText: lugandaText?.substring(0, 50) });
    
    if (!bookId || !chapter || !verseNumber) {
      console.error('❌ VerseEditor received undefined props:', { bookId, chapter, verseNumber });
    }
  }, [bookId, chapter, verseNumber, englishText, lugandaText]);
  const englishEditorRef = useRef<HTMLDivElement>(null);
  const lugandaEditorRef = useRef<HTMLDivElement>(null);
  
  const [englishStyle, setEnglishStyle] = useState<VerseStyle>({
    fontSize: 16,
    fontFamily: 'Times New Roman, serif',
    color: '#000000',
    bold: false,
    italic: false
  });

  const [lugandaStyle, setLugandaStyle] = useState<VerseStyle>({
    fontSize: 16,
    fontFamily: 'Times New Roman, serif',
    color: '#000000',
    bold: false,
    italic: false
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeLanguage, setActiveLanguage] = useState<'english' | 'luganda'>('english');
  const [englishContent, setEnglishContent] = useState(englishText);
  const [lugandaContent, setLugandaContent] = useState(lugandaText);

  useEffect(() => {
    // Sanitize stored HTML before loading into editors (strips --tw-* junk from prior pastes)
    const cleanEnglish = sanitizePastedHtml(englishText || '');
    const cleanLuganda = sanitizePastedHtml(lugandaText || '');
    setEnglishContent(cleanEnglish);
    setLugandaContent(cleanLuganda);
    
    if (englishEditorRef.current) {
      englishEditorRef.current.innerHTML = cleanEnglish;
      applyStylesToEditor(englishEditorRef.current, englishStyle);
    }
    if (lugandaEditorRef.current) {
      lugandaEditorRef.current.innerHTML = cleanLuganda;
      applyStylesToEditor(lugandaEditorRef.current, lugandaStyle);
    }
  }, [englishText, lugandaText]);

  // Sync editor content when tab switches
  useEffect(() => {
    if (activeLanguage === 'english' && englishEditorRef.current) {
      setEnglishContent(englishEditorRef.current.innerHTML);
    } else if (activeLanguage === 'luganda' && lugandaEditorRef.current) {
      setLugandaContent(lugandaEditorRef.current.innerHTML);
    }
  }, [activeLanguage]);

  const applyStylesToEditor = (editorEl: HTMLDivElement, style: VerseStyle) => {
    if (!editorEl) return;
    editorEl.style.fontSize = `${style.fontSize}px`;
    editorEl.style.fontFamily = style.fontFamily;
    editorEl.style.color = style.color;
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editor = activeLanguage === 'english' ? englishEditorRef.current : lugandaEditorRef.current;
    editor?.focus();
  };

  const changeFontSize = (increment: number) => {
    const currentStyle = activeLanguage === 'english' ? englishStyle : lugandaStyle;
    const newSize = Math.max(10, Math.min(72, currentStyle.fontSize + increment));
    
    if (activeLanguage === 'english') {
      setEnglishStyle({ ...englishStyle, fontSize: newSize });
      if (englishEditorRef.current) {
        englishEditorRef.current.style.fontSize = `${newSize}px`;
      }
    } else {
      setLugandaStyle({ ...lugandaStyle, fontSize: newSize });
      if (lugandaEditorRef.current) {
        lugandaEditorRef.current.style.fontSize = `${newSize}px`;
      }
    }
  };

  const changeFontFamily = (font: string) => {
    if (activeLanguage === 'english') {
      setEnglishStyle({ ...englishStyle, fontFamily: font });
      if (englishEditorRef.current) {
        englishEditorRef.current.style.fontFamily = font;
      }
    } else {
      setLugandaStyle({ ...lugandaStyle, fontFamily: font });
      if (lugandaEditorRef.current) {
        lugandaEditorRef.current.style.fontFamily = font;
      }
    }
  };

  const applyColor = (color: string) => {
    execCommand('foreColor', color);
    if (activeLanguage === 'english') {
      setEnglishStyle({ ...englishStyle, color });
    } else {
      setLugandaStyle({ ...lugandaStyle, color });
    }
  };

  const saveVerse = async () => {
    setSaving(true);
    setMessage('');

    try {
      console.log('💾 Starting verse save process...');
      
      // Capture latest content from BOTH editors, regardless of which tab is active
      const latestEnglish = englishEditorRef.current?.innerHTML || englishContent || '';
      const latestLuganda = lugandaEditorRef.current?.innerHTML || lugandaContent || '';
      
      console.log('📝 Captured verse content:', {
        englishLength: latestEnglish.length,
        lugandaLength: latestLuganda.length,
        englishPreview: latestEnglish.substring(0, 50),
        lugandaPreview: latestLuganda.substring(0, 50)
      });

      // Validate we have required data
      if (!bookId || !chapter || !verseNumber) {
        console.error('❌ Missing required data for save:', { bookId, chapter, verseNumber });
        throw new Error(`Missing required data: bookId=${bookId}, chapter=${chapter}, verseNumber=${verseNumber}`);
      }
      
      console.log('✅ All required fields present');

      // Always save both languages to preserve them
      const formattedContent = {
        english: {
          text: latestEnglish,
          fontSize: englishStyle.fontSize,
          fontFamily: englishStyle.fontFamily,
          color: englishStyle.color,
          styles: {}
        },
        luganda: {
          text: latestLuganda,
          fontSize: lugandaStyle.fontSize,
          fontFamily: lugandaStyle.fontFamily,
          color: lugandaStyle.color,
          styles: {}
        }
      };

      const payload = {
        bookId: Number(bookId),
        chapter: Number(chapter),
        verseNumber: Number(verseNumber),
        text_english: latestEnglish,
        text_luganda: latestLuganda,
        formatted_content: formattedContent
      };

      console.log('📤 Sending verse save request:', payload);

      const res = await fetch('/api/bible-verses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📊 Save response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.text();
        console.error('❌ API Error response:', errorData);
        throw new Error(`HTTP ${res.status}: ${errorData || 'Failed to save verse'}`);
      }

      const data = await res.json();
      console.log('✅ Save response:', data);

      setMessage('✅ Both languages saved successfully!');
      setEnglishContent(latestEnglish);
      setLugandaContent(latestLuganda);
      setTimeout(() => {
        onSave();
      }, 800);
    } catch (error) {
      console.error('Error saving verse:', error);
      setMessage('❌ Error saving verse: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteVerse = async () => {
    if (!verseId) {
      setMessage('❌ Cannot delete: Verse ID not found');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${chapter}:${verseNumber}? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      console.log('🗑️ Starting verse deletion for ID:', verseId);

      const res = await fetch(`/api/bible-verses?id=${verseId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`Failed to delete: HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ Verse deleted:', data);
      setMessage('✅ Verse deleted successfully!');
      
      setTimeout(() => {
        onSave();
      }, 800);
    } catch (error) {
      console.error('Error deleting verse:', error);
      setMessage('❌ Error deleting verse: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = [
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Libre Baskerville', value: 'Libre Baskerville, serif' },
    { name: 'EB Garamond', value: 'EB Garamond, serif' },
    { name: 'Merriweather', value: 'Merriweather, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Palatino', value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
    { name: 'Garamond', value: 'Garamond, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' }
  ];

  const colorOptions = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Blue', value: '#2563EB' },
    { name: 'Green', value: '#16A34A' },
    { name: 'Orange', value: '#EA580C' },
    { name: 'Purple', value: '#9333EA' },
    { name: 'Yellow', value: '#CA8A04' }
  ];

  const currentStyle = activeLanguage === 'english' ? englishStyle : lugandaStyle;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-300 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            Edit {activeLanguage === 'english' ? 'English' : 'Luganda'} Text - {chapter}:{verseNumber}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 p-2 flex gap-2">
          <button
            onClick={() => setActiveLanguage('english')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              activeLanguage === 'english'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            English (KJV)
          </button>
          <button
            onClick={() => setActiveLanguage('luganda')}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              activeLanguage === 'luganda'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Luganda
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-300 p-3 flex items-center gap-2 flex-wrap sticky top-16">
          {/* Font Family Selector */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <select
              value={currentStyle.fontFamily}
              onChange={(e) => changeFontFamily(e.target.value)}
              className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Font Family"
            >
              {fontOptions.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Controls */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              type="button"
              onClick={() => changeFontSize(-2)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Decrease font size"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-medium min-w-[2rem] text-center">{currentStyle.fontSize}px</span>
            <button
              type="button"
              onClick={() => changeFontSize(2)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Increase font size"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
            <button
              type="button"
              onClick={() => execCommand('bold')}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors font-bold"
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors italic"
              title="Italic"
            >
              <Italic size={16} />
            </button>
          </div>

          {/* Color Options */}
          <div className="flex items-center gap-1">
            <Type size={16} className="text-gray-500" />
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => applyColor(color.value)}
                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="p-4">
          {/* English Editor */}
          {activeLanguage === 'english' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">English Text (KJV)</label>
              <div
                ref={englishEditorRef}
                contentEditable
                suppressContentEditableWarning
                onPaste={(e) => {
                  e.preventDefault();
                  const html = e.clipboardData?.getData('text/html') || '';
                  const text = e.clipboardData?.getData('text/plain') || '';
                  if (html) {
                    document.execCommand('insertHTML', false, sanitizePastedHtml(html));
                  } else {
                    document.execCommand('insertText', false, text);
                  }
                }}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] bg-white"
                style={{
                  fontSize: `${englishStyle.fontSize}px`,
                  fontFamily: englishStyle.fontFamily,
                  color: englishStyle.color,
                  lineHeight: '1.8'
                }}
              />
            </div>
          )}

          {/* Luganda Editor */}
          {activeLanguage === 'luganda' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Luganda Text</label>
              <div
                ref={lugandaEditorRef}
                contentEditable
                suppressContentEditableWarning
                onPaste={(e) => {
                  e.preventDefault();
                  const html = e.clipboardData?.getData('text/html') || '';
                  const text = e.clipboardData?.getData('text/plain') || '';
                  if (html) {
                    document.execCommand('insertHTML', false, sanitizePastedHtml(html));
                  } else {
                    document.execCommand('insertText', false, text);
                  }
                }}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px] bg-white"
                style={{
                  fontSize: `${lugandaStyle.fontSize}px`,
                  fontFamily: lugandaStyle.fontFamily,
                  color: lugandaStyle.color,
                  lineHeight: '1.8'
                }}
              />
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-4 flex justify-between items-center">
          <button
            onClick={deleteVerse}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
            title="Delete this verse from the database"
          >
            🗑️ Delete Verse
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveVerse}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 font-medium transition-colors"
            >
              {saving ? 'Saving...' : '✅ Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
