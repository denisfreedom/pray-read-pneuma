import { create } from 'zustand';

interface Admin {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  isAdmin: boolean;
  admin: Admin | null;
  isLoading: boolean;
  setAdmin: (admin: Admin) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAdmin: false,
  admin: null,
  isLoading: true,

  setAdmin: (admin: Admin) => {
    set({ isAdmin: true, admin, isLoading: false });
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    set({ isAdmin: false, admin: null });
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json();
      
      if (data.success && data.isAdmin && data.admin) {
        set({ isAdmin: true, admin: data.admin, isLoading: false });
      } else {
        set({ isAdmin: false, admin: null, isLoading: false });
      }
    } catch (error) {
      console.error('Session check error:', error);
      set({ isAdmin: false, admin: null, isLoading: false });
    }
  },
}));
