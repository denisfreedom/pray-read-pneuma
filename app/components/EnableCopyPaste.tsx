'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function EnableCopyPaste() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Check if we're in an admin area
    const isAdminArea = pathname?.startsWith('/admin-panel') || 
                        pathname?.startsWith('/cpanel-') || 
                        pathname?.includes('admin') ||
                        pathname?.includes('settings');
    
    if (!isAdminArea) {
      return; // Only enable in admin areas
    }

    console.log('EnableCopyPaste active for:', pathname);

    // Force enable context menu in admin areas
    const enableContextMenu = (e: MouseEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      return true;
    };

    // Override any oncontextmenu disabling - use capture phase to intercept first
    document.addEventListener('contextmenu', enableContextMenu, { capture: true });
    
    // Enable copy, cut, paste, and select all
    const enableCopyPaste = (e: KeyboardEvent) => {
      // Allow Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A in admin areas
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        return true;
      }
    };

    const enableCopy = (e: ClipboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const enableCut = (e: ClipboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const enablePaste = (e: ClipboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Use capture phase to intercept events before other handlers
    document.addEventListener('keydown', enableCopyPaste, { capture: true });
    document.addEventListener('copy', enableCopy, { capture: true });
    document.addEventListener('cut', enableCut, { capture: true });
    document.addEventListener('paste', enablePaste, { capture: true });

    // Force text selection to be enabled
    const style = document.createElement('style');
    style.id = 'admin-enable-selection';
    style.textContent = `
      /* Force enable text selection in admin areas */
      body * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
        cursor: auto !important;
      }
      
      input, textarea, select, [contenteditable], [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
        pointer-events: auto !important;
      }

      /* Specifically target form elements and rich text editors */
      form input,
      form textarea,
      form select,
      [class*="editor"],
      [class*="input"],
      [class*="textarea"],
      [role="textbox"],
      .ql-editor,
      .tiptap,
      .ProseMirror {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
        pointer-events: auto !important;
      }

      /* Enable selection highlight */
      ::selection {
        background-color: rgba(59, 130, 246, 0.3);
        color: inherit;
      }

      ::-moz-selection {
        background-color: rgba(59, 130, 246, 0.3);
        color: inherit;
      }
      
      /* Override any potential blocking styles */
      * {
        -webkit-user-drag: auto !important;
      }
    `;
    
    // Remove old style if exists
    const oldStyle = document.getElementById('admin-enable-selection');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    document.head.appendChild(style);

    // Remove all existing 'user-select: none' inline styles in admin areas
    const removeUserSelectNone = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.style.userSelect === 'none') {
          htmlElement.style.userSelect = 'text';
        }
        if (htmlElement.style.webkitUserSelect === 'none') {
          htmlElement.style.webkitUserSelect = 'text';
        }
        // Force enable on input elements
        if (htmlElement.tagName === 'INPUT' || 
            htmlElement.tagName === 'TEXTAREA' || 
            htmlElement.tagName === 'SELECT' ||
            htmlElement.isContentEditable) {
          htmlElement.style.userSelect = 'text';
          htmlElement.style.webkitUserSelect = 'text';
        }
      });
    };

    // Prevent any scripts from disabling context menu
    const forceEnableContextMenu = () => {
      document.oncontextmenu = null;
      document.body.oncontextmenu = null;
      window.oncontextmenu = null;
    };

    // Run initially and on DOM changes
    removeUserSelectNone();
    forceEnableContextMenu();
    
    const observer = new MutationObserver(() => {
      removeUserSelectNone();
      forceEnableContextMenu();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', enableContextMenu, { capture: true } as any);
      document.removeEventListener('keydown', enableCopyPaste, { capture: true } as any);
      document.removeEventListener('copy', enableCopy, { capture: true } as any);
      document.removeEventListener('cut', enableCut, { capture: true } as any);
      document.removeEventListener('paste', enablePaste, { capture: true } as any);
      observer.disconnect();
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [pathname]);

  return null;
}
