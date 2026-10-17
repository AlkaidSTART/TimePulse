import { create } from 'zustand';

export type Theme = 'light' | 'cream';

export interface ThemeState {
  theme: Theme;
  accentColor: string;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  updateAccentColor: (color: string) => void;
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
  if (typeof window === 'undefined') return '#0ea5e9';
  try {
    return localStorage.getItem('accent-color') || '#0ea5e9';
  } catch {
    return '#0ea5e9';
  }
}

export function applyThemeToDom(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('cream', theme === 'cream');
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
}

export function updateCssVariables(color: string): void {
  if (typeof document === 'undefined') return;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const rgb = result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [14, 165, 233];
  document.documentElement.style.setProperty('--color-primary', rgb.join(', '));
}

const initialTheme = readInitialTheme();
const initialAccentColor = readInitialAccentColor();

// 初始化时应用到 DOM
applyThemeToDom(initialTheme);
updateCssVariables(initialAccentColor);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  accentColor: initialAccentColor,

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
    updateCssVariables(color);
    set({ accentColor: color });
  },
}));

/**
 * 兼容旧版 Context 的自定义 Hook
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const updateAccentColor = useThemeStore((s) => s.updateAccentColor);

  return {
    theme,
    accentColor,
    toggleTheme,
    updateAccentColor,
  };
}
