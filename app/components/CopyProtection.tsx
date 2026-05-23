'use client';

import { useEffect } from 'react';

export default function CopyProtection() {
  useEffect(() => {
    // Prevent copy events
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent cut events
    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent paste events (optional, but included for completeness)
    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent context menu (right-click)
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for copy/cut (Ctrl+C, Ctrl+X, Cmd+C, Cmd+X)
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Check for Ctrl+C, Ctrl+X, Cmd+C, Cmd+X (but allow Ctrl+A/Cmd+A for selecting)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'C' || 
         e.key === 'x' || e.key === 'X')
      ) {
        // Allow copy in input/textarea fields
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCut);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    // Cleanup
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCut);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  return null;
}
