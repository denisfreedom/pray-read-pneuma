import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSizeLevel = 'small' | 'medium' | 'large' | 'extra-large';

interface FontSizeState {
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const fontSizes: FontSizeLevel[] = ['small', 'medium', 'large', 'extra-large'];

export const useFontSizeStore = create<FontSizeState>()(
  persist(
    (set, get) => ({
      fontSize: 'medium',
      
      setFontSize: (size) => set({ fontSize: size }),
      
      increaseFontSize: () => {
        const current = get().fontSize;
        const currentIndex = fontSizes.indexOf(current);
        if (currentIndex < fontSizes.length - 1) {
          set({ fontSize: fontSizes[currentIndex + 1] });
        }
      },
      
      decreaseFontSize: () => {
        const current = get().fontSize;
        const currentIndex = fontSizes.indexOf(current);
        if (currentIndex > 0) {
          set({ fontSize: fontSizes[currentIndex - 1] });
        }
      },
    }),
    {
      name: 'font-size-storage',
    }
  )
);

// Helper function to get text size classes based on font size level
export const getTextSizeClasses = (fontSize: FontSizeLevel) => {
  const classes = {
    small: {
      body: 'text-sm',
      verse: 'text-base',
      heading: 'text-lg',
      subheading: 'text-base',
      label: 'text-xs',
    },
    medium: {
      body: 'text-base',
      verse: 'text-lg',
      heading: 'text-xl',
      subheading: 'text-lg',
      label: 'text-sm',
    },
    large: {
      body: 'text-lg',
      verse: 'text-xl',
      heading: 'text-2xl',
      subheading: 'text-xl',
      label: 'text-base',
    },
    'extra-large': {
      body: 'text-xl',
      verse: 'text-2xl',
      heading: 'text-3xl',
      subheading: 'text-2xl',
      label: 'text-lg',
    },
  };
  return classes[fontSize];
};
