import { create } from 'zustand';

export interface PlayerSong {
  id: number;
  title: string;
  description?: string;
  mp3_url: string;
  thumbnail?: string;
  duration: number;
  series_title?: string;
  series_id?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  isMiniPlayer: boolean;
  isMaximized: boolean;
  isQueueVisible: boolean;
  playlist: PlayerSong[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  currentSeriesId: number | null;
  isOnPlayerPage: boolean;
  
  // Actions
  setCurrentSong: (song: PlayerSong) => void;
  setPlaylist: (songs: PlayerSong[], startIndex?: number, seriesId?: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextSong: () => void;
  previousSong: () => void;
  setMiniPlayer: (mini: boolean) => void;
  setIsMaximized: (maximized: boolean) => void;
  clearPlayer: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setIsShuffle: (shuffle: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (vol: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsOnPlayerPage: (isOnPlayerPage: boolean) => void;
  setIsQueueVisible: (visible: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  isMiniPlayer: false,
  isMaximized: false,
  isQueueVisible: false,
  playlist: [],
  currentIndex: -1,
  repeatMode: 'off',
  isShuffle: false,
  currentTime: 0,
  volume: 1,
  isMuted: false,
  currentSeriesId: null,
  isOnPlayerPage: false,

  setCurrentSong: (song) => {
    const state = get();
    const existingIndex = state.playlist.findIndex(s => s.id === song.id);
    
    if (existingIndex !== -1) {
      set({ 
        currentSong: song, 
        currentIndex: existingIndex, 
        isPlaying: true, 
        isMiniPlayer: false, 
        currentTime: 0,
        currentSeriesId: song.series_id || state.currentSeriesId
      });
    } else {
      set({ 
        currentSong: song, 
        playlist: [song],
        currentIndex: 0,
        isPlaying: true,
        isMiniPlayer: false,
        currentTime: 0,
        currentSeriesId: song.series_id || null
      });
    }
  },

  setPlaylist: (songs, startIndex = 0, seriesId) => {
    if (songs.length > 0) {
      set({
        playlist: songs,
        currentSong: songs[startIndex] || songs[0],
        currentIndex: startIndex,
        isPlaying: true,
        isMiniPlayer: false,
        isMaximized: true,
        currentTime: 0,
        currentSeriesId: seriesId || null
      });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

  nextSong: () => {
    const state = get();
    if (state.playlist.length === 0) return;
    
    const nextIndex = (state.currentIndex + 1) % state.playlist.length;
    set({
      currentSong: state.playlist[nextIndex],
      currentIndex: nextIndex,
      isPlaying: true,
      currentTime: 0
    });
  },

  previousSong: () => {
    const state = get();
    if (state.playlist.length === 0) return;
    
    const prevIndex = state.currentIndex === 0 
      ? state.playlist.length - 1 
      : state.currentIndex - 1;
    
    set({
      currentSong: state.playlist[prevIndex],
      currentIndex: prevIndex,
      isPlaying: true,
      currentTime: 0
    });
  },

  setMiniPlayer: (mini) => set({ isMiniPlayer: mini }),
  setIsMaximized: (maximized) => set({ isMaximized: maximized }),
  
  clearPlayer: () => set({ 
    currentSong: null, 
    isPlaying: false, 
    playlist: [], 
    currentIndex: -1,
    isMiniPlayer: false,
    isMaximized: false,
    currentTime: 0,
    currentSeriesId: null
  }),

  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setIsShuffle: (shuffle) => set({ isShuffle: shuffle }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setVolume: (vol) => set({ volume: vol, isMuted: vol === 0 }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setIsOnPlayerPage: (isOnPlayerPage) => set({ isOnPlayerPage }),
  setIsQueueVisible: (visible) => set({ isQueueVisible: visible })
}));
