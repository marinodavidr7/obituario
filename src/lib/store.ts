import { create } from "zustand";

interface AudioState {
  currentUrl: string | null;
  currentTitle: string | null;
  currentSubtitle: string | null;
  isPlaying: boolean;
  playTrack: (url: string, title?: string, subtitle?: string) => void;
  pauseTrack: () => void;
  togglePlay: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  currentUrl: null,
  currentTitle: null,
  currentSubtitle: null,
  isPlaying: false,
  playTrack: (url, title, subtitle) =>
    set({
      currentUrl: url,
      currentTitle: title || "Melodía de Recuerdo",
      currentSubtitle: subtitle || null,
      isPlaying: true,
    }),
  pauseTrack: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
