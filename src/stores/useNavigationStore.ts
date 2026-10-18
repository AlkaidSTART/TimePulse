import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export type PageView = 'cheer' | 'main' | 'todo' | 'settings' | 'auth';

export interface NavigationState {
  view: PageView;
  direction: 1 | -1;
  isAbout: boolean;
  isTodo: boolean;
  isCheer: boolean;
  isMain: boolean;
  isSettings: boolean;
  isAuth: boolean;
  transitionTo: (nextView: PageView) => void;
  setView: (view: PageView, direction?: 1 | -1) => void;
}

export const PAGE_ORDER: Record<PageView, number> = {
  cheer: 0,
  main: 1,
  todo: 2,
  settings: 3,
  auth: 4,
};

/**
 * 校验目标页面访问权限：
 * 若认证系统已初始化但无登录用户，仅允许访问 auth 登录注册路由，其余受保护路由拒绝放行。
 */
export function canAccessView(targetView: PageView): boolean {
  if (targetView === 'auth') return true;
  const { isInitialized, user } = useAuthStore.getState();
  if (isInitialized && !user) {
    return false;
  }
  return true;
}

/**
 * 获取未登录拦截时的默认认证 Hash：
 * 若本地已注册过账号则引导至 #login，未注册过账号则引导至 #register。
 */
export function getDefaultAuthHash(): string {
  if (typeof window === 'undefined') return '#register';
  try {
    return localStorage.getItem('timepulse_has_registered') === 'true' ? '#login' : '#register';
  } catch {
    return '#register';
  }
}

function getInitialView(): PageView {
  if (typeof window === 'undefined') return 'cheer';
  const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
  if (rawHash === 'cheer') return 'cheer';
  if (rawHash === 'todo') return 'todo';
  if (rawHash === 'settings' || rawHash === 'profile') return 'settings';
  if (rawHash === 'main' || rawHash === 'timer') return 'main';
  if (rawHash === 'auth' || rawHash === 'login' || rawHash === 'register' || rawHash === 'forgot') return 'auth';

  // 默认无指定路由时，进入元气打气页面
  return 'cheer';
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
  isAuth: initialView === 'auth',

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
        isAuth: nextView === 'auth',
        isAbout: false,
      });
    }
  },

  transitionTo: (nextView: PageView) => {
    if (typeof window === 'undefined') {
      get().setView(nextView);
      return;
    }

    // 路由鉴权守卫：未登录不允许放行至受保护页面
    if (!canAccessView(nextView)) {
      if (window.location.hash !== '#login' && window.location.hash !== '#register' && window.location.hash !== '#forgot') {
        window.location.hash = getDefaultAuthHash();
      }
      get().setView('auth');
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
    let targetView: PageView | null = null;

    if (rawHash === 'cheer') {
      targetView = 'cheer';
    } else if (rawHash === 'main' || rawHash === 'timer') {
      targetView = 'main';
    } else if (rawHash === 'todo') {
      targetView = 'todo';
    } else if (rawHash === 'settings' || rawHash === 'profile') {
      targetView = 'settings';
    } else if (rawHash === 'auth' || rawHash === 'login' || rawHash === 'register' || rawHash === 'forgot') {
      targetView = 'auth';
    } else if (rawHash === '' || rawHash === '/') {
      targetView = getInitialView();
    } else {
      // 弹窗类 hash (如 #background, #manage) 不触发页面主视图切换
      return;
    }

    // 路由鉴权守卫：未登录不允许放行至受保护页面
    if (!canAccessView(targetView)) {
      useNavigationStore.getState().setView('auth');
      if (window.location.hash !== '#login' && window.location.hash !== '#register' && window.location.hash !== '#forgot') {
        window.location.hash = getDefaultAuthHash();
      }
      return;
    }

    useNavigationStore.getState().setView(targetView);
  };

  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('popstate', handleHashChange);

  // 监听 Auth 认证状态变化，严格把控页面访问权限
  useAuthStore.subscribe((state, prevState) => {
    // 1. 初始化完成且未登录：若当前不是登录注册页，拦截并重定向
    if (state.isInitialized && !state.user) {
      const currentView = useNavigationStore.getState().view;
      if (currentView !== 'auth') {
        useNavigationStore.getState().setView('auth');
        const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
        if (rawHash !== 'login' && rawHash !== 'register' && rawHash !== 'auth' && rawHash !== 'forgot') {
          window.location.hash = getDefaultAuthHash();
        }
      }
    }
    // 2. 登出：立刻切回登录页并锁定所有路由
    if (prevState?.user && !state.user) {
      useNavigationStore.getState().setView('auth');
      window.location.hash = '#login';
    }
    // 3. 登录成功：如果当前在 auth 页，自动放行进入主页
    if (!prevState?.user && state.user) {
      const currentView = useNavigationStore.getState().view;
      if (currentView === 'auth') {
        useNavigationStore.getState().transitionTo('main');
      }
    }
  });
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
  const isAuth = useNavigationStore((s) => s.isAuth);
  const transitionTo = useNavigationStore((s) => s.transitionTo);

  return {
    view,
    direction,
    isAbout,
    isCheer,
    isMain,
    isTodo,
    isSettings,
    isAuth,
    transitionTo,
  };
}
