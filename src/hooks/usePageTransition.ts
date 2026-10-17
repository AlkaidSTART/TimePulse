import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type PageView = 'main' | 'todo';

type PageTransitionContextValue = {
  view: PageView;
  isAbout: boolean;
  isTodo: boolean;
  direction: 1 | -1;
  transitionTo: (view: PageView) => void;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

function getInitialView(): PageView {
  if (typeof window === 'undefined') return 'main';
  const hash = window.location.hash;
  return hash === '#todo' || hash === '#/todo' ? 'todo' : 'main';
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<PageView>(getInitialView);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const nextView: PageView = hash === '#todo' || hash === '#/todo' ? 'todo' : 'main';
      setView((prev) => {
        if (prev !== nextView) {
          setDirection(nextView === 'todo' ? 1 : -1);
        }
        return nextView;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const transitionTo = useCallback((nextView: PageView) => {
    if (nextView === 'todo') {
      if (window.location.hash !== '#todo' && window.location.hash !== '#/todo') {
        window.location.hash = 'todo';
      } else {
        setView('todo');
        setDirection(1);
      }
    } else {
      if (window.location.hash === '#todo' || window.location.hash === '#/todo') {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          window.location.hash = '';
        }
      } else {
        setView('main');
        setDirection(-1);
      }
    }
  }, []);

  const value: PageTransitionContextValue = {
    view,
    isAbout: false,
    isTodo: view === 'todo',
    direction,
    transitionTo,
  };

  return createElement(
    PageTransitionContext.Provider,
    { value },
    children,
  );
}

export function usePageTransition(): PageTransitionContextValue {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }

  return context;
}

