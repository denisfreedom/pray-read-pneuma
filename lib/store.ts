import { create } from 'zustand';

interface TranslationStore {
  selectedTranslation: 'english' | 'luganda';
  setSelectedTranslation: (translation: 'english' | 'luganda') => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  selectedTranslation: 'english',
  setSelectedTranslation: (translation) => set({ selectedTranslation: translation }),
}));
