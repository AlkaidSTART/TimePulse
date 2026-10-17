import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AutoResizer, AutoTransition } from '@/components/ui';
import Layout from '@/components/layout/Layout';
import { CustomBackground, GradientBackground } from '@/features/background/components';
import BackgroundSettingsModal from '@/features/background/components/BackgroundSettingsModal';
import FullscreenSettingsModal from '@/features/fullscreen/components/FullscreenSettingsModal';
import TimerDisplay from '@/features/countdown/components/TimerDisplay';
import { useTimers } from './providers/TimerProvider';
import { useTheme } from './providers/ThemeProvider';
import { useFullscreen } from './providers/FullscreenProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { parseShareUrl } from '@/services/sharing';
import { usePageTransition } from '@/hooks/usePageTransition';
import {
  TodoPage,
  TodoListWidget,
  readTodoWidgetVisible,
  writeTodoWidgetVisible,
  TODO_STORAGE_EVENT,
} from '@/features/todo';
import type { Timer } from '../domain/timer';

export default function Home() {
  const { timers, activeTimerId, setActiveTimerId, addTimer } = useTimers();
  const { theme, accentColor } = useTheme();
  const { isFullscreen, isHeaderVisible } = useFullscreen();
  const { view, direction, transitionTo } = usePageTransition();
  const { t } = useTranslation();
  const showMainPage = view === 'main' || isFullscreen;
  const showTodoPage = view === 'todo' && !isFullscreen;
  const [headerHeight, setHeaderHeight] = useState(0);
  
  const [isBackgroundSettingsOpen, setIsBackgroundSettingsOpen] = useState(false);
  const [isFullscreenSettingsOpen, setIsFullscreenSettingsOpen] = useState(false);
  const [isWidgetEnabled, setIsWidgetEnabled] = useState(() => readTodoWidgetVisible());
  const [isTodoWidgetOpen, setIsTodoWidgetOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Mobile horizontal swipe gestures to switch timers
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isFullscreen || timers.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || timers.length <= 1) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Detect distinct horizontal swipe
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const currentIndex = timers.findIndex((t) => t.id === activeTimerId);
      if (currentIndex !== -1) {
        if (deltaX < 0) {
          // Swipe left -> next timer
          const nextIndex = (currentIndex + 1) % timers.length;
          setActiveTimerId(timers[nextIndex].id);
        } else {
          // Swipe right -> prev timer
          const prevIndex = (currentIndex - 1 + timers.length) % timers.length;
          setActiveTimerId(timers[prevIndex].id);
        }
      }
    }
  };

  // 添加日志
  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

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
          addLog('已从分享链接导入计时器数据');
        }
      } catch (error) {
        addLog(`解析分享数据错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [addTimer, setActiveTimerId]);

  // 初始化日志
  useEffect(() => {
    addLog('TimePulse 初始化完成');
    addLog(`当前主题: ${theme}`);
    addLog(`加载了 ${timers.length} 个计时器`);
  }, [theme, timers.length]);

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

      switch (hash) {
        case 'background':
          setIsBackgroundSettingsOpen(true);
          break;
        case 'fullscreen-settings':
          setIsFullscreenSettingsOpen(true);
          break;
        case 'todo-widget':
          setIsWidgetEnabled(true);
          writeTodoWidgetVisible(true);
          setIsTodoWidgetOpen(true);
          break;
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      <Layout onHeaderHeightChange={setHeaderHeight}>
        <GradientBackground />
        <CustomBackground />

        <AnimatePresence initial={false} custom={direction}>
          {showMainPage ? (
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
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                initial={false}
                animate={{ y: isFullscreen && !isHeaderVisible ? 0 : headerHeight / 2 }}
                transition={{ y: { duration: 0.45, ease: 'easeInOut' } }}
                className={`relative flex h-full min-h-0 flex-col items-center justify-center ${
                  isFullscreen ? '' : 'py-6 md:py-12 pb-24 md:pb-12'
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
                initial: (value: unknown) => ({ opacity: 0, y: value === 1 ? 56 : -56 }),
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.36,
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
              <TodoPage
                onBack={() => transitionTo('main')}
                onOpenAsWidget={() => {
                  setIsWidgetEnabled(true);
                  writeTodoWidgetVisible(true);
                  transitionTo('main');
                  setIsTodoWidgetOpen(true);
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Layout>
      
      {/* 背景设置弹窗 */}
      <AutoTransition portal transitionKey={isBackgroundSettingsOpen ? 'background-open' : 'background-closed'} initial={false}>
        {isBackgroundSettingsOpen ? (
          <BackgroundSettingsModal onClose={() => {
            setIsBackgroundSettingsOpen(false);
            if (window.location.hash === '#background') {
              window.location.hash = '';
            }
          }} />
        ) : null}
      </AutoTransition>

      {/* 全屏设置弹窗 */}
      <AutoTransition portal transitionKey={isFullscreenSettingsOpen ? 'fullscreen-open' : 'fullscreen-closed'} initial={false}>
        {isFullscreenSettingsOpen ? (
          <FullscreenSettingsModal onClose={() => {
            setIsFullscreenSettingsOpen(false);
            if (window.location.hash === '#fullscreen-settings') {
              window.location.hash = '';
            }
          }} />
        ) : null}
      </AutoTransition>

      {/* 小型支持拖拽的 TodoList & Checklist 悬浮挂件（取决于用户偏好选择是否显示） */}
      {!isFullscreen && view === 'main' && isWidgetEnabled && (
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
      )}
    </>
  );
}
