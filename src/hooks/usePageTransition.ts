import { createContext, createElement, type ReactNode } from 'react';
import {
  usePageTransition,
  useNavigationStore,
  type PageView,
} from '@/stores/useNavigationStore';

export type { PageView };

export type PageTransitionContextValue = {
  view: PageView;
  isAbout: boolean;
  isCheer: boolean;
  isMain: boolean;
  isTodo: boolean;
  isSettings: boolean;
  isAuth: boolean;
  direction: 1 | -1;
  transitionTo: (view: PageView) => void;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const value = usePageTransition();

  return createElement(
    PageTransitionContext.Provider,
    { value },
    children,
  );
}

export { usePageTransition, useNavigationStore };

export default PageTransitionContext;
