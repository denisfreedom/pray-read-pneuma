'use client';

import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Type, Minus, Plus } from 'lucide-react';

// Allowed inline style properties (whitelist — everything else is stripped)
const ALLOWED_STYLE_PROPS = new Set([
  'font-family', 'font-size', 'font-weight', 'font-style',
  'color', 'text-decoration', 'text-decoration-line',
]);

// Sanitize HTML to remove Word/Office/browser garbage (Tailwind vars, bg-colors, text-shadow, etc.)
function sanitizeHtml(html: string): string {
  // Strip Word/Office conditional comments and namespace tags
  let cleaned = html
    .replace(/<!--\[if[\s\S]*?\[endif\]-->/gi, '')
    .replace(/<!--\[if[\s\S]*?-->/gi, '')
    .replace(/<!--\[endif\]-->/gi, '')
    .replace(/<!\[if[\s\S]*?\!\[endif\]>/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<o:p[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/o:p>/gi, '');

  const temp = document.createElement('div');
  temp.innerHTML = cleaned;

  const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT, null, false as any);
  const nodesToRemove: Element[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    const el = currentNode as Element;

    // Strip Word-specific classes
    if (el.className && typeof el.className === 'string' && el.className.includes('Mso')) {
      el.className = '';
    }

    // Queue Word namespace elements for removal (o:p, w:whatever, etc.)
    if (el.tagName && el.tagName.includes(':')) {
      nodesToRemove.push(el);
    }

    // Remove every non-style attribute except a few safe ones
    Array.from(el.attributes).forEach(attr => {
      if (!['style', 'href', 'target'].includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });

    // Whitelist inline styles — keep only font/color/text-decoration
    if (el.hasAttribute('style')) {
      const style = el.getAttribute('style') || '';
      const cleanStyle = style
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false;
          const prop = s.split(':')[0].trim().toLowerCase();
          // Drop CSS custom properties (--tw-*, --*), background, shadow, margin, padding, etc.
          if (prop.startsWith('--')) return false;
          return ALLOWED_STYLE_PROPS.has(prop);
        })
        .join('; ');

      if (cleanStyle) {
        el.setAttribute('style', cleanStyle);
      } else {
        el.removeAttribute('style');
      }
    }

    currentNode = walker.nextNode();
  }

  // Unwrap Word namespace elements (keep their children)
  nodesToRemove.forEach(node => {
    if (node.parentNode) {
      while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
      node.parentNode.removeChild(node);
    }
  });

  return temp.innerHTML;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultColor?: 'red' | 'blue' | 'black';
  minHeight?: string;
  enableAdminColors?: boolean;
  bookId?: number;
  chapter?: number;
  verseNumber?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  defaultColor = 'black',
  minHeight = '150px',
  enableAdminColors = false,
  bookId,
  chapter,
  verseNumber
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Times New Roman, serif');
  const [lastValue, setLastValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [currentColor, setCurrentColor] = useState('#000000');

  useEffect(() => {
    if (editorRef.current && value !== lastValue) {
      console.log('RichTextEditor: Value changed', { 
        valueLength: value?.length, 
        lastValueLength: lastValue?.length,
        valuePreview: value?.substring(0, 100)
      });
      
      if (value) {
        // Parse the value to extract font settings
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = value;
        
        // Check if content has wrapper with font styles
        const styledWrapper = tempDiv.querySelector('[data-styled-content]') as HTMLElement;
        if (styledWrapper) {
          const savedFontFamily = styledWrapper.style.fontFamily;
          const savedFontSize = styledWrapper.style.fontSize;
          
          if (savedFontFamily) {
            setFontFamily(savedFontFamily);
          }
          
          if (savedFontSize) {
            const sizeNum = parseInt(savedFontSize);
            if (!isNaN(sizeNum)) {
              setFontSize(sizeNum);
            }
          }
          
          // Sanitize before loading to strip any previously-pasted junk
          editorRef.current.innerHTML = sanitizeHtml(styledWrapper.innerHTML);
        } else {
          // Sanitize stored content to strip --tw-* vars, background-color, text-shadow etc.
          editorRef.current.innerHTML = sanitizeHtml(value);
        }
      } else {
        // Clear editor if value is empty
        editorRef.current.innerHTML = '';
      }
      
      // Apply initial styles
      editorRef.current.style.fontFamily = fontFamily;
      editorRef.current.style.fontSize = `${fontSize}px`;
      
      setLastValue(value);
    }
  }, [value, lastValue, fontFamily, fontSize]);

  const handleInput = () => {
    if (editorRef.current) {
      // Get the current HTML content from the editor
      let html = editorRef.current.innerHTML;
      
      // Sanitize to remove Word/Office garbage
      html = sanitizeHtml(html);
      
      // Update editor with cleaned HTML
      if (html !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = html;
      }
      
      // Create a wrapper div with the current font styles and explicit line-height
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-styled-content', 'true');
      wrapper.style.fontFamily = fontFamily;
      wrapper.style.fontSize = `${fontSize}px`;
      wrapper.style.lineHeight = '1.8'; // Fixed line-height to prevent spacing issues
      wrapper.innerHTML = html;
      
      // Save the complete wrapper HTML
      onChange(wrapper.outerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const changeFontSize = (increment: number) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      
      // If there's a selection, apply to selected text
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // Get current font size of selected text
        let currentSize = fontSize;
        if (parentElement) {
          const computedSize = window.getComputedStyle(parentElement).fontSize;
          const sizeNum = parseInt(computedSize);
          if (!isNaN(sizeNum)) {
            currentSize = sizeNum;
          }
        }
        
        // Calculate new size
        const newSize = Math.max(10, Math.min(72, currentSize + increment));
        
        // Wrap selected text in a span with the new font size
        const span = document.createElement('span');
        span.style.fontSize = `${newSize}px`;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        // Clear selection
        selection.removeAllRanges();
        editorRef.current.focus();
      } else {
        // No selection: apply to entire editor content
        const newSize = Math.max(10, Math.min(72, fontSize + increment));
        
        // Update state (this will trigger re-render and update the displayed number)
        setFontSize(newSize);
        
        // Apply to entire editor
        editorRef.current.style.fontSize = `${newSize}px`;
        
        // Also update all existing span elements
        const allSpans = editorRef.current.querySelectorAll('span[style*="font-size"]');
        allSpans.forEach((span) => {
          if (span instanceof HTMLElement) {
            const currentSpanSize = parseInt(window.getComputedStyle(span).fontSize);
            if (!isNaN(currentSpanSize)) {
              span.style.fontSize = `${Math.max(10, Math.min(72, currentSpanSize + increment))}px`;
            }
          }
        });
      }
      
      // Trigger onChange to save changes
      handleInput();
    }
  };

  const changeFontFamily = (font: string) => {
    setFontFamily(font);
    
    // Apply to entire editor
    if (editorRef.current) {
      editorRef.current.style.fontFamily = font;
      // Trigger onChange to save the new font family
      handleInput();
    }
  };

  const applyColor = async (color: string) => {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || !editorRef.current) {
      alert('Please select text first');
      return;
    }

    // Update current color state
    setCurrentColor(color);
    setSelectedColor(color);

    // For admin color mode
    if (enableAdminColors && bookId && chapter && verseNumber) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      // Calculate offsets relative to the editor content
      const preRange = document.createRange();
      preRange.selectNodeContents(editorRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preRange.toString().length;
      const endOffset = startOffset + selectedText.length;

      try {
        // Save to database
        const response = await fetch('/api/admin-text-colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            chapter,
            verseNumber,
            startOffset,
            endOffset,
            color,
            textContent: selectedText
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save color');
        }

        // Apply color visually
        execCommand('foreColor', color);
        
        // Trigger onChange to save changes
        handleInput();
        
        alert('Color saved successfully!');
      } catch (error) {
        console.error('Error saving admin color:', error);
        alert('Failed to save color');
      }
    } else {
      // Regular color application
      execCommand('foreColor', color);
      
      // Trigger onChange to save changes
      handleInput();
    }
  };

  const colorOptions = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Blue', value: '#2563EB' },
    { name: 'Green', value: '#16A34A' },
    { name: 'Orange', value: '#EA580C' },
    { name: 'Purple', value: '#9333EA' },
    { name: 'Yellow', value: '#CA8A04' }
  ];

  const fontOptions = [
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Libre Baskerville', value: 'Libre Baskerville, serif' },
    { name: 'EB Garamond', value: 'EB Garamond, serif' },
    { name: 'Merriweather', value: 'Merriweather, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Palatino', value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
    { name: 'Garamond', value: 'Garamond, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Inter', value: 'Inter, sans-serif' }
  ];

  const defaultColorValue = {
    red: '#DC2626',
    blue: '#2563EB',
    black: '#000000'
  }[defaultColor];

  useEffect(() => {
    if (editorRef.current && !value) {
      editorRef.current.style.color = defaultColorValue;
      setCurrentColor(defaultColorValue);
      setSelectedColor(defaultColorValue);
    }
  }, [defaultColorValue, value]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex items-center gap-2 flex-wrap">
        {/* Font Family Selector */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <select
            value={fontFamily}
            onChange={(e) => changeFontFamily(e.target.value)}
            className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Font Family"
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
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
          <span className="text-sm font-medium min-w-[2rem] text-center">{fontSize}px</span>
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
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors underline"
            title="Underline"
          >
            <Underline size={16} />
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
              className={`w-6 h-6 rounded border-2 transition-colors ${
                currentColor === color.value 
                  ? 'border-blue-500 ring-2 ring-blue-300' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={(e) => {
          try {
            // Prevent default paste to handle it ourselves
            e.preventDefault();
            
            // Get pasted content from clipboard
            const data = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || '';
            
            // If it's HTML, clean it
            if (e.clipboardData?.types.includes('text/html')) {
              const sanitized = sanitizeHtml(data);
              document.execCommand('insertHTML', false, sanitized);
            } else {
              // For plain text, just insert it
              document.execCommand('insertText', false, data);
            }
            
            // Trigger change event
            handleInput();
          } catch (error) {
            console.error('Paste error:', error);
            // Fallback: allow default paste behavior
          }
        }}
        className="p-3 outline-none overflow-auto"
        style={{ 
          minHeight,
          color: defaultColorValue,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          lineHeight: '1.8' // Fixed line-height
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
