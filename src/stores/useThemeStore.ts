import { create } from 'zustand';
import { CHATGPT_THEME_PRESETS, type ThemeColorId } from '@/constants/colors';

export type Theme = 'light' | 'cream';

export interface ThemeState {
  theme: Theme;
  accentColor: string;
  themePresetId: string;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  updateAccentColor: (color: string) => void;
  setThemePreset: (presetId: string, customColor?: string) => void;
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'cream';
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'cream') return savedTheme;
    if (savedTheme === 'dark') {
      try {
        localStorage.setItem('theme', 'cream');
      } catch {
        // Ignore storage errors
      }
      return 'cream';
    }
  } catch {
    // Keep default theme
  }
  return 'cream';
}

function readInitialAccentColor(): string {
  if (typeof window === 'undefined') return '#10A37F';
  try {
    return localStorage.getItem('accent-color') || '#10A37F';
  } catch {
    return '#10A37F';
  }
}

function findMatchingPresetId(color: string): string {
  const normalized = color.toLowerCase().trim();
  const match = CHATGPT_THEME_PRESETS.find(
    (preset) => preset.color.toLowerCase() === normalized
  );
  return match ? match.id : 'custom';
}

function readInitialThemePresetId(accentColor: string): string {
  if (typeof window === 'undefined') return 'green';
  try {
    const saved = localStorage.getItem('theme-preset');
    if (saved === 'black') return 'default';
    if (saved) return saved;
  } catch {
    // Ignore storage errors
  }
  return findMatchingPresetId(accentColor);
}

export function applyThemeToDom(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('cream', theme === 'cream');
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'cream' ? '#f7f4eb' : '#ffffff');
  }
}

export function updateCssVariables(color: string): void {
  if (typeof document === 'undefined') return;
  // 仅设置字体/数字高亮色，确保米白色与白色主题的基础控件、按钮和滚动条不受污染
  document.documentElement.style.setProperty('--color-font-accent', color);
  document.documentElement.style.setProperty('--color-primary', '14, 165, 233');
}

const initialTheme = readInitialTheme();
const initialAccentColor = readInitialAccentColor();
const initialThemePresetId = readInitialThemePresetId(initialAccentColor);

// 初始化时应用到 DOM
applyThemeToDom(initialTheme);
updateCssVariables(initialAccentColor);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  accentColor: initialAccentColor,
  themePresetId: initialThemePresetId,

  setTheme: (nextTheme: Theme) => {
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // Ignore storage errors
    }
    applyThemeToDom(nextTheme);
    console.log(`主题已切换到: ${nextTheme} - ${new Date().toLocaleString()}`);
    set({ theme: nextTheme });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme: Theme = state.theme === 'light' ? 'cream' : 'light';
      try {
        localStorage.setItem('theme', nextTheme);
      } catch {
        // Ignore storage errors
      }
      applyThemeToDom(nextTheme);
      console.log(`主题已切换到: ${nextTheme} - ${new Date().toLocaleString()}`);
      return { theme: nextTheme };
    });
  },

  updateAccentColor: (color: string) => {
    if (!color) return;
    try {
      localStorage.setItem('accent-color', color);
    } catch {
      // Ignore storage errors
    }
    const matchedPreset = findMatchingPresetId(color);
    try {
      localStorage.setItem('theme-preset', matchedPreset);
    } catch {
      // Ignore storage errors
    }
    updateCssVariables(color);
    set({ accentColor: color, themePresetId: matchedPreset });
  },

  setThemePreset: (presetId: string, customColor?: string) => {
    let nextColor: string;
    if (presetId === 'custom') {
      nextColor = customColor || get().accentColor || '#10A37F';
    } else {
      const preset = CHATGPT_THEME_PRESETS.find((p) => p.id === presetId);
      nextColor = preset ? preset.color : (presetId === 'black' ? '#18181B' : '#10A37F');
    }

    try {
      localStorage.setItem('theme-preset', presetId);
      localStorage.setItem('accent-color', nextColor);
    } catch {
      // Ignore storage errors
    }

    updateCssVariables(nextColor);
    set({ themePresetId: presetId, accentColor: nextColor });
  },
}));

/**
 * 兼容旧版 Context 的自定义 Hook
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const themePresetId = useThemeStore((s) => s.themePresetId);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const updateAccentColor = useThemeStore((s) => s.updateAccentColor);
  const setThemePreset = useThemeStore((s) => s.setThemePreset);

  return {
    theme,
    accentColor,
    themePresetId,
    toggleTheme,
    setTheme,
    updateAccentColor,
    setThemePreset,
  };
}

