import { createContext, type ReactNode } from 'react';
import { useThemeStore, useTheme, type Theme } from '@/stores/useThemeStore';

export type { Theme };

export type ThemeContextValue = {
  theme: Theme;
  accentColor: string;
  toggleTheme: () => void;
  updateAccentColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme();

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export { useTheme };

export function ThemeColorSynchronizer({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default ThemeContext;
