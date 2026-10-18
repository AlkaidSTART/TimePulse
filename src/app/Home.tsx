import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AutoResizer } from '@/components/ui/auto-resizer';
import { AutoTransition } from '@/components/ui/auto-transition';
import Layout from '@/components/layout/Layout';
import CustomBackground from '@/features/background/components/CustomBackground';
import GradientBackground from '@/features/background/components/GradientBackground';
import TimerDisplay from '@/features/countdown/components/TimerDisplay';
import { useTimers } from './providers/TimerProvider';
import { useTheme } from './providers/ThemeProvider';
import { useFullscreen } from './providers/FullscreenProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { parseShareUrl } from '@/services/sharing';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useGlobalTouchGestures } from '@/hooks/useGlobalTouchGestures';
import {
  readTodoWidgetVisible,
  writeTodoWidgetVisible,
  TODO_STORAGE_EVENT,
} from '@/features/todo/todoStorage';
import { useAuthStore } from '@/stores/useAuthStore';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import type { Timer } from '../domain/timer';

const BackgroundSettingsModal = lazy(() => import('@/features/background/components/BackgroundSettingsModal'));
const FullscreenSettingsModal = lazy(() => import('@/features/fullscreen/components/FullscreenSettingsModal'));
const CheerPage = lazy(() => import('@/features/cheer/components/CheerPage'));
const TodoPage = lazy(() => import('@/features/todo/components/TodoPage'));
const TodoListWidget = lazy(() => import('@/features/todo/components/TodoListWidget'));
const PersonalSettingsPage = lazy(() => import('@/features/settings/components/PersonalSettingsPage'));
const AuthPage = lazy(() => import('@/features/auth/components/AuthPage'));

export default function Home() {
  const shouldReduceMotion = useReducedMotion();
  const { timers, activeTimerId, setActiveTimerId, addTimer } = useTimers();
  const { theme, accentColor } = useTheme();
  const { isFullscreen, isHeaderVisible } = useFullscreen();
  const { view, direction, transitionTo } = usePageTransition();
  const user = useAuthStore((s) => s.user);
  const isAuthInitialized = useAuthStore((s) => s.isInitialized);
  const { t } = useTranslation();
  const showCheerPage = view === 'cheer';
  const showTodoPage = view === 'todo';
  const showSettingsPage = view === 'settings';
  const showMainPage = view === 'main';
  const [headerHeight, setHeaderHeight] = useState(0);
  
  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFullscreenSettingsOpen, setIsFullscreenSettingsOpen] = useState(false);
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(() => readTodoWidgetVisible());
  const [isTodoWidgetOpen, setIsTodoWidgetOpen] = useState(false);

  // 全局移动端触摸手势系统（多页面左右滑动切换、计时器切换、全屏手势、双击全屏、触觉反馈）
  const activeTimerIndex = timers.findIndex((t) => t.id === activeTimerId);
  useGlobalTouchGestures({
    enabled: true,
    timersCount: timers.length,
    activeTimerIndex: activeTimerIndex >= 0 ? activeTimerIndex : 0,
    onNextTimer: () => {
      if (timers.length <= 1) return;
      const curIdx = timers.findIndex((t) => t.id === activeTimerId);
      const nextIdx = (curIdx + 1) % timers.length;
      setActiveTimerId(timers[nextIdx].id);
    },
    onPrevTimer: () => {
      if (timers.length <= 1) return;
      const curIdx = timers.findIndex((t) => t.id === activeTimerId);
      const prevIdx = (curIdx - 1 + timers.length) % timers.length;
      setActiveTimerId(timers[prevIdx].id);
    },
  });

  // 监听URL参数以同步数据
  useEffect(() => {
    const share = new URLSearchParams(window.location.search).get('share');
    if (share) {
      try {
        const sharedData = parseShareUrl(share) as { timers?: Timer[] } | null;
        if (sharedData?.timers && sharedData.timers.length > 0) {
          sharedData.timers.forEach(timer => {
            addTimer(timer);
          });
          setActiveTimerId(sharedData.timers[0].id);
        }
      } catch (error) {
        console.warn(`解析分享数据错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [addTimer, setActiveTimerId]);

  // 监听挂件可见性设置的更新
  useEffect(() => {
    const handleWidgetSync = () => {
      setIsWidgetEnabled(readTodoWidgetVisible());
    };
    window.addEventListener(TODO_STORAGE_EVENT, handleWidgetSync);
    window.addEventListener('storage', handleWidgetSync);
    return () => {
      window.removeEventListener(TODO_STORAGE_EVENT, handleWidgetSync);
      window.removeEventListener('storage', handleWidgetSync);
    };
  }, []);

  // 监听 hash 变化打开弹窗
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');

      setIsBackgroundSettingsOpen(hash === 'background');
      setIsFullscreenSettingsOpen(hash === 'fullscreen-settings');

      if (hash === 'todo-widget') {
        setIsWidgetEnabled(true);
        writeTodoWidgetVisible(true);
        setIsTodoWidgetOpen(true);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 1. 首屏初始化认证检查未完成：呈现温润禅意的 TimePulse 呼吸光环加载态，避免受保护内容产生任何泄露或闪烁
  if (!isAuthInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark cream:bg-background-cream select-none transition-colors duration-300">
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
            <div
              className="absolute -inset-4 rounded-full blur-xl opacity-25 animate-pulse"
              style={{ backgroundColor: accentColor || '#10A37F' }}
            />
            <AnimatedLogo accentColor={accentColor} size="lg" />
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wider font-mono">
              正在连接时光空间...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. 独立登录注册路由与未登录拦截（未登录禁止放行，直接展示独立美化后的登录注册页）
  if (view === 'auth' || !user) {
    return (
      <Suspense fallback={null}>
        <AuthPage />
      </Suspense>
    );
  }

  return (
    <>
      <Layout onHeaderHeightChange={setHeaderHeight}>
        <GradientBackground />
        <CustomBackground />

        <AnimatePresence initial={false} custom={direction}>
          {showCheerPage ? (
            <motion.div
              key="cheer-page-visible"
              custom={direction}
              variants={{
                initial: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? 56 : -56),
                }),
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: shouldReduceMotion ? 0 : 0.36,
                    ease: 'easeOut',
                  },
                },
                exit: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? -56 : 56),
                  transition: { duration: shouldReduceMotion ? 0 : 0.28, ease: 'easeIn' },
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 z-10"
            >
              <motion.div
                initial={false}
                animate={{ y: isFullscreen && !isHeaderVisible ? 0 : headerHeight / 2 }}
                transition={{ y: { duration: shouldReduceMotion ? 0 : 0.45, ease: 'easeInOut' } }}
                className="h-full w-full"
              >
                <Suspense fallback={null}>
                  <CheerPage />
                </Suspense>
              </motion.div>
            </motion.div>
          ) : showMainPage ? (
            <motion.div
              key="timer-page-visible"
              custom={direction}
              variants={{
                initial: (value: unknown) => ({ opacity: 0, y: value === 1 ? 56 : -56 }),
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.36,
                    delay: view === 'main' && direction === -1 ? 0.2 : 0,
                    ease: 'easeOut',
                  },
                },
                exit: (value: unknown) => ({
                  opacity: 0,
                  y: value === 1 ? -56 : 56,
                  transition: { duration: 0.28, ease: 'easeIn' },
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 z-10"
            >
              <motion.main
                initial={false}
                animate={{ y: isFullscreen && !isHeaderVisible ? 0 : headerHeight / 2 }}
                transition={{ y: { duration: shouldReduceMotion ? 0 : 0.45, ease: 'easeInOut' } }}
                className={`relative flex h-full min-h-0 flex-col items-center justify-center ${
                  isFullscreen ? '' : 'py-6 lg:py-12 pb-24 lg:pb-12 landscape:py-2 landscape:pb-14 lg:landscape:py-12 lg:landscape:pb-12'
                }`}
                data-page-view="main"
              >
                <AutoResizer className="flex w-full items-center justify-center" initial={false} overflow="visible">
                  <TimerDisplay />
                </AutoResizer>
              </motion.main>
            </motion.div>
          ) : showTodoPage ? (
            <motion.div
              key="todo-page-visible"
              custom={direction}
              variants={{
                initial: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? 56 : -56),
                }),
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: shouldReduceMotion ? 0 : 0.36,
                    ease: 'easeOut',
                  },
                },
                exit: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? -56 : 56),
                  transition: { duration: shouldReduceMotion ? 0 : 0.28, ease: 'easeIn' },
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 z-10"
            >
              <Suspense fallback={null}>
                <TodoPage
                  onBack={() => transitionTo('main')}
                  onOpenAsWidget={() => {
                    setIsWidgetEnabled(true);
                    writeTodoWidgetVisible(true);
                    transitionTo('main');
                    setIsTodoWidgetOpen(true);
                  }}
                />
              </Suspense>
            </motion.div>
          ) : showSettingsPage ? (
            <motion.div
              key="settings-page-visible"
              custom={direction}
              variants={{
                initial: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? 56 : -56),
                }),
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: shouldReduceMotion ? 0 : 0.36,
                    ease: 'easeOut',
                  },
                },
                exit: (value: unknown) => ({
                  opacity: 0,
                  y: shouldReduceMotion ? 0 : (value === 1 ? -56 : 56),
                  transition: { duration: shouldReduceMotion ? 0 : 0.28, ease: 'easeIn' },
                }),
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 z-10"
            >
              <Suspense fallback={null}>
                <PersonalSettingsPage />
              </Suspense>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Layout>
      
      {/* 背景设置弹窗 */}
      <AutoTransition portal transitionKey={isBackgroundSettingsOpen ? 'background-open' : 'background-closed'} initial={false}>
        {isBackgroundSettingsOpen ? (
          <Suspense fallback={null}>
            <BackgroundSettingsModal onClose={() => {
              setIsBackgroundSettingsOpen(false);
              if (window.location.hash === '#background') {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
            }} />
          </Suspense>
        ) : null}
      </AutoTransition>

      {/* 全屏设置弹窗 */}
      <AutoTransition portal transitionKey={isFullscreenSettingsOpen ? 'fullscreen-open' : 'fullscreen-closed'} initial={false}>
        {isFullscreenSettingsOpen ? (
          <Suspense fallback={null}>
            <FullscreenSettingsModal onClose={() => {
              setIsFullscreenSettingsOpen(false);
              if (window.location.hash === '#fullscreen-settings') {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
            }} />
          </Suspense>
        ) : null}
      </AutoTransition>

      {/* 小型支持拖拽的 TodoList & Checklist 悬浮挂件（取决于用户偏好选择是否显示） */}
      {!isFullscreen && view === 'main' && isWidgetEnabled && (
        <Suspense fallback={null}>
          <TodoListWidget
            isOpen={isTodoWidgetOpen}
            onOpenChange={setIsTodoWidgetOpen}
            onOpenAsPage={() => {
              setIsTodoWidgetOpen(false);
              transitionTo('todo');
            }}
            onHideWidget={() => {
              setIsTodoWidgetOpen(false);
              writeTodoWidgetVisible(false);
              setIsWidgetEnabled(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
