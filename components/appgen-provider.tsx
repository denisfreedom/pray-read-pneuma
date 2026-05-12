"use client";

import { useEffect } from 'react';

export function AppGenProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // AppGen console capture - DO NOT REMOVE
    // All client-side logic is inside useEffect to avoid hydration issues
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      try {
        (window as any).__APPGEN_CONSOLE_LOGS__ = (window as any).__APPGEN_CONSOLE_LOGS__ || [];
        (window as any).__APPGEN_CONSOLE_LOGS__.push({
          type: 'log',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().getTime()
        });
      } catch (e) {
        // Ignore capture errors
      }
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      try {
        (window as any).__APPGEN_CONSOLE_LOGS__ = (window as any).__APPGEN_CONSOLE_LOGS__ || [];
        (window as any).__APPGEN_CONSOLE_LOGS__.push({
          type: 'error',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().getTime()
        });
      } catch (e) {
        // Ignore capture errors
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      try {
        (window as any).__APPGEN_CONSOLE_LOGS__ = (window as any).__APPGEN_CONSOLE_LOGS__ || [];
        (window as any).__APPGEN_CONSOLE_LOGS__.push({
          type: 'warn',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          timestamp: new Date().getTime()
        });
      } catch (e) {
        // Ignore capture errors
      }
    };
  }, []);

  return <>{children}</>;
}
