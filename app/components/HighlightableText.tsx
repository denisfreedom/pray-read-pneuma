'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { injectScriptureRefs, ScriptureContext, ScriptureRef, useScripturePopup, ScriptureVersePopup } from '@/components/ScriptureVersePopup';

// Strip dangerous/broken inline styles from stored HTML before display
// Keeps only font-family, font-size, font-weight, font-style, color, text-decoration
const SAFE_STYLE_PROPS = new Set([
  'font-family', 'font-size', 'font-weight', 'font-style',
  'color', 'text-decoration', 'text-decoration-line',
]);

function cleanDisplayHtml(raw: string): string {
  if (!raw || typeof window === 'undefined') return raw;
  // Quick check — if no suspicious patterns, skip DOM work
  if (!raw.includes('--tw-') && !raw.includes('background-color') && !raw.includes('text-shadow') && !raw.includes('<!--')) return raw;
  try {
    const temp = document.createElement('div');
    temp.innerHTML = raw;
    const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT, null, false as any);
    let node = walker.nextNode();
    while (node) {
      const el = node as Element;
      if (el.hasAttribute('style')) {
        const clean = (el.getAttribute('style') || '')
          .split(';')
          .map(s => s.trim())
          .filter(s => {
            if (!s) return false;
            const prop = s.split(':')[0].trim().toLowerCase();
            if (prop.startsWith('--')) return false;
            return SAFE_STYLE_PROPS.has(prop);
          })
          .join('; ');
        clean ? el.setAttribute('style', clean) : el.removeAttribute('style');
      }
      node = walker.nextNode();
    }
    return temp.innerHTML;
  } catch {
    return raw;
  }
}

const HIGHLIGHT_STYLES = `
  .ht-yellow { background-color: rgba(253, 224, 71, 0.55); border-radius: 2px; }
  .ht-green  { background-color: rgba(134, 239, 172, 0.55); border-radius: 2px; }
  .ht-blue   { background-color: rgba(147, 197, 253, 0.55); border-radius: 2px; }
  .ht-pink   { background-color: rgba(249, 168, 212, 0.55); border-radius: 2px; }
  .ht-orange { background-color: rgba(253, 186, 116, 0.55); border-radius: 2px; }
  .ht-underline { text-decoration: underline !important; text-decoration-color: #f97316 !important; text-underline-offset: 3px; }
  .ht-root { -webkit-user-select: text; user-select: text; cursor: text; }
`;

const COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'];
const COLOR_BG: Record<string, string> = {
  yellow: '#fde047', green: '#86efac', blue: '#93c5fd',
  pink: '#f9a8d4', orange: '#fdba74',
};

interface Highlight {
  id: number | string;
  start_offset: number;
  end_offset: number;
  highlight_color: string;
  is_underline: boolean;
  text_content: string;
}

interface Props {
  /** Unique key for localStorage + DB grouping (e.g. "book-commentary-42") */
  sectionKey: string;
  /** Plain text or HTML content to display (HTML is stripped for positioning) */
  html: string;
  /** Optional: render the content as-is using dangerouslySetInnerHTML (default: true) */
  renderHtml?: boolean;
  className?: string;
  userEmail?: string | null;
  /** When provided, scripture references in the HTML will be clickable */
  scriptureContext?: ScriptureContext;
  /** External popup open handler — if provided, use it; otherwise use internal popup */
  onVerseClick?: (ref: ScriptureRef) => void;
}

/**
 * Wraps any text content and adds a floating highlight/underline toolbar
 * when the user selects text. Highlights are saved to localStorage and
 * optionally to /api/highlights (with sectionKey as the section_type).
 */
export default function HighlightableText({ sectionKey, html, renderHtml = true, className = '', userEmail, scriptureContext, onVerseClick }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);
  const [savedHighlights, setSavedHighlights] = useState<Highlight[]>([]);
  const pendingRange = useRef<Range | null>(null);

  // Internal scripture popup (only used when scriptureContext is set without external onVerseClick)
  const { popup: scripturePopup, openVerse, closePopup } = useScripturePopup();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ht_${sectionKey}`);
      if (raw) setSavedHighlights(JSON.parse(raw));
    } catch {}
  }, [sectionKey]);

  // Save to localStorage helper
  const persist = useCallback((items: Highlight[]) => {
    try { localStorage.setItem(`ht_${sectionKey}`, JSON.stringify(items)); } catch {}
  }, [sectionKey]);

  // Re-apply saved highlights whenever content re-renders
  useEffect(() => {
    if (!rootRef.current || savedHighlights.length === 0) return;
    applyHighlightsToDom(savedHighlights);
  });

  const applyHighlightsToDom = (highlights: Highlight[]) => {
    const container = rootRef.current;
    if (!container) return;
    highlights.forEach(h => {
      if (document.querySelector(`[data-ht-id="${h.id}"]`)) return;
      const fullText = container.textContent || '';
      const start = h.start_offset;
      const end = h.end_offset;
      if (start < 0 || end > fullText.length || start >= end) return;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let offset = 0;
      let startNode: Text | null = null, startOff = 0, endNode: Text | null = null, endOff = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const len = node.textContent?.length || 0;
        if (!startNode && offset + len > start) { startNode = node; startOff = start - offset; }
        if (!endNode && offset + len >= end) { endNode = node; endOff = end - offset; break; }
        offset += len;
      }
      if (!startNode || !endNode) return;
      try {
        const range = document.createRange();
        range.setStart(startNode, startOff);
        range.setEnd(endNode, endOff);
        const span = document.createElement('span');
        span.setAttribute('data-ht-id', String(h.id));
        span.className = h.is_underline ? 'ht-underline' : `ht-${h.highlight_color}`;
        range.surroundContents(span);
      } catch {}
    });
  };

  const getOffset = (node: Node, offset: number, container: HTMLElement): number => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let total = 0;
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      if (n === node) return total + offset;
      total += (n.textContent || '').length;
    }
    return total + offset;
  };

  const checkSelection = useCallback(() => {
    if (!rootRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!rootRef.current.contains(range.commonAncestorContainer)) { setToolbar(null); return; }
    pendingRange.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    const vw = window.innerWidth;
    const rawX = rect.left + rect.width / 2;
    const x = Math.max(90, Math.min(rawX, vw - 90));
    const rawY = rect.top - 8;
    const y = rawY < 60 ? rect.bottom + 8 : rawY;
    setToolbar({ x, y });
  }, []);

  useEffect(() => {
    const onSelChange = () => {
      clearTimeout((onSelChange as any)._t);
      (onSelChange as any)._t = setTimeout(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) checkSelection();
      }, 250);
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, [checkSelection]);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (toolbar && !toolbarRef.current?.contains(e.target as Node)) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) setToolbar(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler as EventListener);
    };
  }, [toolbar]);

  const applyMark = useCallback((color: string, isUnderline: boolean) => {
    const range = pendingRange.current;
    const container = rootRef.current;
    if (!range || !container) return;
    const sel = window.getSelection();
    const selectedText = range.toString().trim();
    if (!selectedText) return;
    const startOff = getOffset(range.startContainer, range.startOffset, container);
    const endOff = startOff + selectedText.length;
    try {
      const span = document.createElement('span');
      const tempId = `local_${Date.now()}`;
      span.setAttribute('data-ht-id', tempId);
      span.className = isUnderline ? 'ht-underline' : `ht-${color}`;
      range.surroundContents(span);
      sel?.removeAllRanges();
      const local: Highlight = {
        id: tempId, start_offset: startOff, end_offset: endOff,
        highlight_color: isUnderline ? 'underline' : color,
        is_underline: isUnderline, text_content: selectedText,
      };
      setSavedHighlights(prev => { const updated = [...prev, local]; persist(updated); return updated; });
      // Persist to DB
      fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: 0, chapter: 0,
          verseNumber: 1,
          startOffset: startOff, endOffset: endOff,
          highlightColor: isUnderline ? 'underline' : color,
          textContent: selectedText,
          userEmail: userEmail || null,
          isUnderline,
          sectionType: sectionKey,
        }),
      }).then(r => r.json()).then(data => {
        if (data.success && data.highlight?.id) {
          span.setAttribute('data-ht-id', String(data.highlight.id));
          setSavedHighlights(prev => {
            const updated = prev.map(h => h.id === tempId ? { ...h, id: data.highlight.id } : h);
            persist(updated);
            return updated;
          });
        }
      }).catch(() => {});
    } catch {}
    setToolbar(null);
    pendingRange.current = null;
  }, [sectionKey, userEmail, persist]);

  // Handle clicks on injected scripture-ref buttons
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest('[data-scripture-ref]');
    if (!btn) return;
    e.preventDefault();
    try {
      const ref: ScriptureRef = JSON.parse((btn as HTMLElement).getAttribute('data-scripture-ref') || '{}');
      if (onVerseClick) {
        onVerseClick(ref);
      } else if (scriptureContext) {
        openVerse(ref);
      }
    } catch {}
  }, [onVerseClick, scriptureContext, openVerse]);

  // Prepare HTML: clean + inject scripture refs if context is available
  const processedHtml = (() => {
    if (!renderHtml || !html) return html;
    const cleaned = cleanDisplayHtml(html);
    if (scriptureContext) return injectScriptureRefs(cleaned, scriptureContext);
    return cleaned;
  })();

  return (
    <>
      <style>{HIGHLIGHT_STYLES}</style>
      <div
        ref={rootRef}
        className={`ht-root relative ${className}`}
        onMouseUp={checkSelection}
        onClick={handleClick}
      >
        {renderHtml
          ? <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
          : html
        }
      </div>
      {toolbar && (
        <div
          ref={toolbarRef}
          className="fixed z-[9999] flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl border border-white/20"
          style={{
            left: toolbar.x, top: toolbar.y,
            transform: 'translateX(-50%)',
            background: 'rgba(15,15,25,0.97)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {COLORS.map(c => (
            <button
              key={c}
              title={`Highlight ${c}`}
              onClick={() => applyMark(c, false)}
              className="w-6 h-6 rounded-full border-2 border-white/30 hover:scale-110 transition-transform"
              style={{ backgroundColor: COLOR_BG[c] }}
            />
          ))}
          <div className="w-px h-5 bg-white/20 mx-0.5" />
          <button
            title="Underline"
            onClick={() => applyMark('underline', true)}
            className="px-2 py-0.5 text-orange-400 font-bold text-sm underline hover:text-orange-300 transition-colors"
            style={{ textDecorationColor: '#f97316' }}
          >
            U
          </button>
        </div>
      )}
      {/* Internal scripture popup — only renders when context is set without external handler */}
      {scriptureContext && !onVerseClick && <ScriptureVersePopup popup={scripturePopup} onClose={closePopup} />}
    </>
  );
}
