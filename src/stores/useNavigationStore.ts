import { create } from 'zustand';

export type PageView = 'cheer' | 'main' | 'todo' | 'settings';

export interface NavigationState {
  view: PageView;
  direction: 1 | -1;
  isAbout: boolean;
  isTodo: boolean;
  isCheer: boolean;
  isMain: boolean;
  isSettings: boolean;
  transitionTo: (nextView: PageView) => void;
  setView: (view: PageView, direction?: 1 | -1) => void;
}

export const PAGE_ORDER: Record<PageView, number> = {
  cheer: 0,
  main: 1,
  todo: 2,
  settings: 3,
};

function getInitialView(): PageView {
  if (typeof window === 'undefined') return 'main';
  const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
  if (rawHash === 'cheer') return 'cheer';
  if (rawHash === 'todo') return 'todo';
  if (rawHash === 'settings' || rawHash === 'profile') return 'settings';
  if (rawHash === 'main' || rawHash === 'timer') return 'main';

  // 默认无指定路由时，始终进入极简时钟主页
  return 'main';
}

const initialView = getInitialView();

export const useNavigationStore = create<NavigationState>((set, get) => ({
  view: initialView,
  direction: 1,
  isAbout: false,
  isCheer: initialView === 'cheer',
  isMain: initialView === 'main',
  isTodo: initialView === 'todo',
  isSettings: initialView === 'settings',

  setView: (nextView: PageView, customDirection?: 1 | -1) => {
    const currentView = get().view;
    const computedDirection: 1 | -1 =
      PAGE_ORDER[nextView] >= PAGE_ORDER[currentView] ? 1 : -1;
    const direction = customDirection ?? computedDirection;

    if (currentView !== nextView || customDirection !== undefined) {
      set({
        view: nextView,
        direction,
        isCheer: nextView === 'cheer',
        isMain: nextView === 'main',
        isTodo: nextView === 'todo',
        isSettings: nextView === 'settings',
        isAbout: false,
      });
    }
  },

  transitionTo: (nextView: PageView) => {
    if (typeof window === 'undefined') {
      get().setView(nextView);
      return;
    }

    const currentView = get().view;
    if (currentView === nextView) return;

    const direction: 1 | -1 =
      PAGE_ORDER[nextView] >= PAGE_ORDER[currentView] ? 1 : -1;

    // 同步浏览器 URL Hash
    const targetHash = nextView === 'cheer' ? '#cheer' : `#${nextView}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }

    get().setView(nextView, direction);
  },
}));

// 监听 hash 变化
if (typeof window !== 'undefined') {
  const handleHashChange = () => {
    const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    if (rawHash === 'cheer') {
      useNavigationStore.getState().setView('cheer');
    } else if (rawHash === 'main' || rawHash === 'timer') {
      useNavigationStore.getState().setView('main');
    } else if (rawHash === 'todo') {
      useNavigationStore.getState().setView('todo');
    } else if (rawHash === 'settings' || rawHash === 'profile') {
      useNavigationStore.getState().setView('settings');
    } else if (rawHash === '' || rawHash === '/') {
      // 访问根路径，按初始设置进入打气或主页
      const defaultStart = getInitialView();
      useNavigationStore.getState().setView(defaultStart);
    }
    // 其他非路由 hash（如 #background, #manage）不触发页面主视图切换
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
  const isCheer = useNavigationStore((s) => s.isCheer);
  const isMain = useNavigationStore((s) => s.isMain);
  const isTodo = useNavigationStore((s) => s.isTodo);
  const isSettings = useNavigationStore((s) => s.isSettings);
  const transitionTo = useNavigationStore((s) => s.transitionTo);

  return {
    view,
    direction,
    isAbout,
    isCheer,
    isMain,
    isTodo,
    isSettings,
    transitionTo,
  };
}
