import { create } from 'zustand';

export type PageView = 'main' | 'todo';

export interface NavigationState {
  view: PageView;
  direction: 1 | -1;
  isAbout: boolean;
  isTodo: boolean;
  transitionTo: (nextView: PageView) => void;
  setView: (view: PageView, direction?: 1 | -1) => void;
}

function getInitialView(): PageView {
  if (typeof window === 'undefined') return 'main';
  const hash = window.location.hash;
  return hash === '#todo' || hash === '#/todo' ? 'todo' : 'main';
}

const initialView = getInitialView();

export const useNavigationStore = create<NavigationState>((set, get) => ({
  view: initialView,
  direction: 1,
  isAbout: false,
  isTodo: initialView === 'todo',

  setView: (nextView: PageView, customDirection?: 1 | -1) => {
    const currentView = get().view;
    const direction = customDirection ?? (nextView === 'todo' ? 1 : -1);
    if (currentView !== nextView || customDirection !== undefined) {
      set({
        view: nextView,
        direction,
        isTodo: nextView === 'todo',
        isAbout: false,
      });
    }
  },

  transitionTo: (nextView: PageView) => {
    if (typeof window === 'undefined') {
      get().setView(nextView);
      return;
    }

    if (nextView === 'todo') {
      if (window.location.hash !== '#todo' && window.location.hash !== '#/todo') {
        window.location.hash = 'todo';
      } else {
        get().setView('todo', 1);
      }
    } else {
      if (window.location.hash === '#todo' || window.location.hash === '#/todo') {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.hash = '';
        }
      } else {
        get().setView('main', -1);
      }
    }
  },
}));

// 监听 hash 变化
if (typeof window !== 'undefined') {
  const handleHashChange = () => {
    const hash = window.location.hash;
    const nextView: PageView = hash === '#todo' || hash === '#/todo' ? 'todo' : 'main';
    useNavigationStore.getState().setView(nextView);
  };

  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('popstate', handleHashChange);
}

/**
 * 兼容原有 Context 的 hook
 */
export function usePageTransition() {
  const view = useNavigationStore((s) => s.view);
  const direction = useNavigationStore((s) => s.direction);
  const isAbout = useNavigationStore((s) => s.isAbout);
  const isTodo = useNavigationStore((s) => s.isTodo);
  const transitionTo = useNavigationStore((s) => s.transitionTo);

  return {
    view,
    direction,
    isAbout,
    isTodo,
    transitionTo,
  };
}
