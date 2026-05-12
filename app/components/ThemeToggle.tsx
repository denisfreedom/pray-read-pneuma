'use client';

import { useThemeStore } from '@/lib/theme-store';
import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    // Apply theme to HTML element
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl transition-all duration-300 hover:scale-105"
      style={{
        background:
          theme === 'dark'
            ? 'rgba(200,160,40,0.12)'
            : 'rgba(200,160,40,0.08)',
        border: `1px solid ${
          theme === 'dark'
            ? 'rgba(200,160,40,0.3)'
            : 'rgba(200,160,40,0.2)'
        }`,
        color: theme === 'dark' ? '#f0c060' : '#c9900a',
      }}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={18} strokeWidth={2} />
      ) : (
        <Sun size={18} strokeWidth={2} />
      )}
    </button>
  );
}
