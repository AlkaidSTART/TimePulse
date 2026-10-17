import { create } from 'zustand';

export interface UIState {
  isBackgroundSettingsOpen: boolean;
  isFullscreenSettingsOpen: boolean;

  setBackgroundSettingsOpen: (open: boolean) => void;
  setFullscreenSettingsOpen: (open: boolean) => void;
  openBackgroundSettings: () => void;
  closeBackgroundSettings: () => void;
  openFullscreenSettings: () => void;
  closeFullscreenSettings: () => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isBackgroundSettingsOpen: false,
  isFullscreenSettingsOpen: false,

  setBackgroundSettingsOpen: (isBackgroundSettingsOpen: boolean) => {
    set({ isBackgroundSettingsOpen });
  },

  setFullscreenSettingsOpen: (isFullscreenSettingsOpen: boolean) => {
    set({ isFullscreenSettingsOpen });
  },

  openBackgroundSettings: () => {
    set({ isBackgroundSettingsOpen: true });
  },

  closeBackgroundSettings: () => {
    set({ isBackgroundSettingsOpen: false });
    if (typeof window !== 'undefined' && window.location.hash === '#background') {
      window.location.hash = '';
    }
  },

  openFullscreenSettings: () => {
    set({ isFullscreenSettingsOpen: true });
  },

  closeFullscreenSettings: () => {
    set({ isFullscreenSettingsOpen: false });
    if (typeof window !== 'undefined' && window.location.hash === '#fullscreen-settings') {
      window.location.hash = '';
    }
  },

  closeAllModals: () => {
    set({
      isBackgroundSettingsOpen: false,
      isFullscreenSettingsOpen: false,
    });
  },
}));

// 监听 URL hash 变化以统一控制弹窗状态
if (typeof window !== 'undefined') {
  const handleHashChange = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'background') {
      useUIStore.getState().setBackgroundSettingsOpen(true);
    } else if (hash === 'fullscreen-settings') {
      useUIStore.getState().setFullscreenSettingsOpen(true);
    }
  };

  window.addEventListener('hashchange', handleHashChange);
  // 初次加载时检查
  handleHashChange();
}
