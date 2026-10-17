import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import type { CSSProperties, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { FiMenu, FiX, FiSettings, FiCoffee, FiSun, FiMaximize, FiMinimize, FiEdit, FiSave, FiGlobe, FiPlus, FiShare2, FiImage, FiMoreHorizontal, FiCheckSquare, FiCheck, FiInfo, FiUser } from 'react-icons/fi';
import { SiWechat } from 'react-icons/si';
import { LuPalette } from 'react-icons/lu';
import { RxDragHandleDots2 } from 'react-icons/rx';
import type { Timer, TimerType } from '@/domain/timer';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useFullscreen } from '@/app/providers/FullscreenProvider';
import { useTranslation } from '@/i18n/useTranslation';
import type { Language } from '@/i18n/types';
import TimerTabs from '@/features/timer-management/components/TimerTabs';
import { PRESET_COLORS } from '@/constants/colors';
import { AutoResizer, AutoTransition } from '@/components/ui';
import { LinearDialogTransition } from '@/components/composed';
import MobileTabBar, { type MobileTab } from './MobileTabBar';
import WebDock from './WebDock';
import AnimatedLogo from './AnimatedLogo';
import RouteNavigation from './RouteNavigation';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTodoStore, useVersionStore } from '@/stores';
import { FiList } from 'react-icons/fi';
import { throttle, debounce } from '@/utils/performance';
import ThemeLibraryModal from '@/components/composed/ThemeLibraryModal';


const ShareModal = lazy(() => import('@/features/sharing/components/ShareModal'));
const TimerCreationFlow = lazy(() => import('@/features/timer-management/components/TimerCreationFlow'));
const HexColorPicker = lazy(() => import('react-colorful').then((m) => ({ default: m.HexColorPicker })));

type TimerUpdate = {
  name: string;
  color?: string;
  targetDate?: string;
};

type TimerEditState = {
  id: string;
  name: string;
  color?: string;
  type?: TimerType;
  targetDate?: string;
  targetTime?: string;
  isLimitedEdit?: boolean;
};

function TimerManageRow({
  timer,
  summary,
  dragLabel,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  timer: Timer;
  summary: string;
  dragLabel: string;
  onEdit: (timer: Timer) => void;
  onDelete: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={timer.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/30 p-3 backdrop-blur-sm hover:bg-white/50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-black/50"
      style={{ borderLeft: `4px solid ${timer.color || '#0ea5e9'}` }}
    >
      <button
        type="button"
        className="inline-flex size-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-md bg-transparent p-0 text-gray-500 transition-colors hover:bg-primary-500/10 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 active:cursor-grabbing dark:text-gray-400 dark:hover:bg-primary-500/15 dark:hover:text-primary-300"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label={`${dragLabel}: ${timer.name}`}
        title={dragLabel}
      >
        <RxDragHandleDots2 className="size-5 text-current" />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium">{timer.name}</h3>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{summary}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 backdrop-blur-sm hover:bg-blue-500/20 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25"
          onClick={() => onEdit(timer)}
          data-insightflare-event="timer_edit_open"
          data-insightflare-event-type={timer.type || 'countdown'}
        >
          <FiEdit className="size-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-600 backdrop-blur-sm hover:bg-red-500/20 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25"
          onClick={() => onDelete(timer.id)}
          data-insightflare-event="timer_delete"
          data-insightflare-event-type={timer.type || 'countdown'}
        >
          <FiX className="size-3.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

function getActiveTimezoneInfo(timer: Timer | null): { text: string; full: string } | null {
  if (!timer || timer.type === 'stopwatch') return null;
  const timezone = timer.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
  if (!timezone) return null;

  let offset = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (offsetPart) {
      offset = offsetPart.replace('GMT', 'UTC');
    }
  } catch {
    // fallback if timezone string is invalid
  }

  if (timer.type === 'worldclock') {
    const city = timer.city?.trim();
    const country = timer.country?.trim();
    const location = city || country || '';
    const text = location ? `${location} · ${timezone}` : timezone;
    const full = offset ? `${text} (${offset})` : text;
    return { text, full };
  }

  // countdown timer
  const text = timezone;
  const full = offset ? `${text} (${offset})` : text;
  return { text, full };
}

type HeaderProps = {
  onHeightChange?: (height: number) => void;
};

export default function Header({ onHeightChange }: HeaderProps) {
  const { timers, activeTimerId, setActiveTimerId, reorderTimers, deleteTimer, updateTimer } = useTimers();
  const { theme, toggleTheme, accentColor } = useTheme();
  const { isFullscreen, isHeaderVisible, headerHideDelay, showHeader, hideHeader, toggleFullscreen } = useFullscreen();
  const { view, transitionTo } = usePageTransition();
  const { t, currentLang, changeLanguage } = useTranslation();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('timer');
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<TimerEditState | null>(null);
  const [manageDirection, setManageDirection] = useState<1 | -1>(1);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isThemeLibraryOpen, setIsThemeLibraryOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isTimerCreationOpen, setIsTimerCreationOpen] = useState(false);
  const [timerOrder, setTimerOrder] = useState(() => timers.map((timer) => timer.id));
  const timerOrderRef = useRef(timerOrder);
  const isWidgetEnabled = useTodoStore((s) => s.isWidgetEnabled);
  const setWidgetEnabled = useTodoStore((s) => s.setWidgetEnabled);
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);
  const openAboutModal = useVersionStore((s) => s.openAboutModal);
  const navRef = useRef<HTMLElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close tools dropdown on outside click
  useEffect(() => {
    if (!isToolsOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isToolsOpen]);

  // Dock visibility state on web desktop
  const [isDockVisible, setIsDockVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('timepulse_dock_visible') !== 'false';
  });

  const toggleDock = () => {
    setIsDockVisible((prev) => {
      const next = !prev;
      localStorage.setItem('timepulse_dock_visible', String(next));
      return next;
    });
  };

  // Sync hash with modal states
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'add') {
        setIsTimerCreationOpen(true);
      } else if (hash === 'share') {
        setIsShareOpen(true);
      } else if (hash === 'manage') {
        setIsManageOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !onHeightChange) return;

    const updateHeight = () => {
      // On mobile and Pad screens, do not push the main timer clock down
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        onHeightChange(0);
        return;
      }
      const styles = window.getComputedStyle(nav);
      const marginTop = Number.parseFloat(styles.marginTop) || 0;
      const headerPaddingTop = Number.parseFloat(window.getComputedStyle(nav.parentElement ?? nav).paddingTop) || 0;
      onHeightChange(nav.offsetHeight + marginTop + headerPaddingTop);
    };
    updateHeight();

    const debouncedUpdateHeight = debounce(updateHeight, 100);

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', debouncedUpdateHeight);
      return () => {
        debouncedUpdateHeight.cancel();
        window.removeEventListener('resize', debouncedUpdateHeight);
      };
    }

    const resizeObserver = new ResizeObserver(() => debouncedUpdateHeight());
    resizeObserver.observe(nav);
    return () => {
      debouncedUpdateHeight.cancel();
      resizeObserver.disconnect();
    };
  }, [onHeightChange]);

  useEffect(() => {
    const availableIds = new Set(timers.map((timer) => timer.id));
    const nextOrder = timerOrderRef.current.filter((id) => availableIds.has(id));
    const orderedIds = new Set(nextOrder);
    for (const timer of timers) {
      if (!orderedIds.has(timer.id)) {
        nextOrder.push(timer.id);
        orderedIds.add(timer.id);
      }
    }
    const orderChanged = nextOrder.length !== timerOrderRef.current.length
      || nextOrder.some((id, index) => id !== timerOrderRef.current[index]);
    timerOrderRef.current = nextOrder;
    if (orderChanged) setTimerOrder(nextOrder);
  }, [timers]);

  const handleTimerReorder = (nextOrder: string[]) => {
    timerOrderRef.current = nextOrder;
    setTimerOrder(nextOrder);
  };

  const handleTimerReorderEnd = () => {
    const currentOrder = timers.map((timer) => timer.id);
    const nextOrder = timerOrderRef.current;
    const orderChanged = nextOrder.length !== currentOrder.length
      || nextOrder.some((id, index) => id !== currentOrder[index]);
    if (orderChanged) reorderTimers(nextOrder);
  };

  const timersById = new Map(timers.map((timer) => [timer.id, timer]));
  const orderedTimerIds = [
    ...timerOrder.filter((id) => timersById.has(id)),
    ...timers.map((timer) => timer.id).filter((id) => !timerOrder.includes(id)),
  ];

  // 处理语言切换
  const switchLanguage = (lang: Language) => {
    changeLanguage(lang);
    setIsLanguageOpen(false);
  };

  // 开始编辑计时器
  const startEditTimer = (timer: Timer) => {
    setManageDirection(1);
    if (timer.type === 'countdown' || !timer.type) {
      // 倒计时可以编辑所有属性
      setEditingTimer({
        ...timer,
        targetDate: new Date(timer.targetDate).toISOString().substring(0, 10),
        targetTime: new Date(timer.targetDate).toTimeString().substring(0, 5)
      });
    } else {
      // 正计时和世界时钟只能编辑名字和颜色
      setEditingTimer({
        id: timer.id,
        name: timer.name,
        color: timer.color,
        type: timer.type,
        isLimitedEdit: true // 标记为限制编辑模式
      });
    }
  };

  // 保存编辑的计时器
  const saveEditedTimer = () => {
    if (!editingTimer) return;
    
    if (editingTimer.isLimitedEdit) {
      // 限制编辑模式：只更新名字和颜色
      updateTimer(editingTimer.id, {
        name: editingTimer.name,
        color: editingTimer.color
      });
    } else {
      // 完整编辑模式：更新所有属性（倒计时）
      const targetDateObj = new Date(`${editingTimer.targetDate}T${editingTimer.targetTime}`);
      
      updateTimer(editingTimer.id, {
        name: editingTimer.name,
        targetDate: targetDateObj.toISOString(),
        color: editingTimer.color
      });
    }
    
    setManageDirection(-1);
    setEditingTimer(null);
    setShowColorPicker(false);
  };

  // 全屏模式下监听鼠标移动 / 触摸，自动显示/隐藏顶部栏
  useEffect(() => {
    // 只在全屏模式下启用
    if (!isFullscreen) {
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      // 有交互时立即显示 Header
      showHeader();

      // 清除之前的隐藏定时器
      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      // 设置新的隐藏定时器
      hideTimer = setTimeout(() => {
        hideHeader();
      }, headerHideDelay);
    };

    const throttledActivity = throttle(handleActivity, 150);

    document.addEventListener('mousemove', throttledActivity, { passive: true });
    // 触屏设备没有 mousemove，用 pointerdown 作为“唤出顶栏”的手势
    document.addEventListener('pointerdown', throttledActivity, { passive: true });

    // 进入全屏后先显示顶栏，再按同样的延时自动隐藏
    handleActivity();

    return () => {
      document.removeEventListener('mousemove', throttledActivity);
      document.removeEventListener('pointerdown', throttledActivity);
      throttledActivity.cancel();
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [isFullscreen, headerHideDelay, showHeader, hideHeader]);

  // 获取当前活动计时器
  const shouldReduceMotion = useReducedMotion();
  const activeTimer = timers.find(timer => timer.id === activeTimerId) || null;
  const isTimerView = view === 'main' || isFullscreen;
  const timezoneInfo = isTimerView ? getActiveTimezoneInfo(activeTimer) : null;

  return (
    <>
      <motion.header
        className="app-header fixed top-0 left-0 right-0 z-40"
      initial={{ y: 0 }}
      animate={{
        y: isFullscreen && !isHeaderVisible ? '-100%' : 0,
        opacity: isFullscreen && !isHeaderVisible ? 0 : 1
      }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      {/* Desktop Header: Completely transparent */}
      <nav
        ref={navRef}
        className="hidden lg:flex w-full items-center justify-between relative px-6 md:px-10 py-3.5 bg-transparent"
      >
        {/* Left: Logo & Route Navigation */}
        <div className="flex items-center gap-3.5 z-10 shrink-0">
          <motion.div 
            className="flex items-center justify-start shrink-0"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
          >
            <AnimatedLogo
              color="#f97316"
              size="lg"
              onClick={() => {
                transitionTo('cheer');
              }}
              onLinkClick={(e) => {
                e.preventDefault();
                transitionTo('cheer');
              }}
            />
          </motion.div>

          {/* Subtle separator */}
          <div className="h-4 w-px bg-gray-300/60 dark:bg-white/15 hidden sm:block" />

          {/* Route Navigation with Hover Effects and Active Route Display */}
          <RouteNavigation />
        </div>

        {/* Center: Dynamic Island Capsule Switcher (always visible) */}
        <TimerTabs
          timers={timers}
          activeTimerId={activeTimerId}
          setActiveTimerId={(id) => {
            setActiveTimerId(id);
            if (view === 'todo') {
              transitionTo('main');
            }
          }}
        />

        {/* Right Controls: Streamlined, clean, cohesive */}
        <div className="flex items-center justify-end z-10 gap-1.5 shrink-0">
          {/* Current Timezone Display */}
          {timezoneInfo && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-gray-200 backdrop-blur-md select-none transition-colors shadow-xs"
              title={`${t('modal.timezone.title', '时区')}: ${timezoneInfo.full}`}
            >
              <FiGlobe className="size-3.5 shrink-0 text-primary-500 dark:text-primary-400" />
              <span className="truncate max-w-[120px] xl:max-w-[180px]">{timezoneInfo.text}</span>
            </div>
          )}

          {/* Quick Add Timer */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 dark:bg-primary-500/15 dark:text-primary-300 font-medium text-xs cursor-pointer transition-colors"
            onClick={() => {
              setIsTimerCreationOpen(true);
              if (window.location.hash !== '#add') window.location.hash = 'add';
            }}
            title="新建计时器"
            data-insightflare-event="timer_create_open"
            data-insightflare-event-from="desktop"
          >
            <FiPlus className="size-3.5 stroke-[2.5]" />
            <span>新建</span>
          </button>

          <div className="h-4 w-px bg-gray-300/50 dark:bg-white/10 mx-0.5" />

          {/* Background Settings */}
          <button
            type="button"
            className="size-8.5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            onClick={() => {
              if (window.location.hash !== '#background') window.location.hash = 'background';
            }}
            title={t('header.background', '背景设置')}
            data-insightflare-event="background_open"
          >
            <FiImage className="size-4.5" />
          </button>

          {/* Share */}
          <button
            type="button"
            className="size-8.5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            onClick={() => {
              setIsShareOpen(true);
              if (window.location.hash !== '#share') window.location.hash = 'share';
            }}
            title={t('share.title', '分享与二维码')}
            data-insightflare-event="share_open"
            data-insightflare-event-from="desktop"
          >
            <FiShare2 className="size-4.5" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="size-8.5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            onClick={toggleTheme}
            title={theme === 'cream' ? t('header.themeLight', '切换浅色模式') : t('header.themeCream', '切换米白色模式')}
            data-insightflare-event="theme_toggle"
            data-insightflare-event-to={theme === 'cream' ? 'light' : 'cream'}
          >
            {theme === 'cream' ? <FiSun className="size-4.5" /> : <FiCoffee className="size-4.5" />}
          </button>

          {/* Theme Palette Library Button */}
          <button
            type="button"
            className="size-8.5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            onClick={() => setIsThemeLibraryOpen(true)}
            title={t('theme.title', '字体配色')}
            data-insightflare-event="theme_palette_open"
          >
            <span
              className="size-4 rounded-full border border-black/15 dark:border-white/20 shadow-xs transition-transform hover:scale-110"
              style={{ backgroundColor: accentColor || '#10A37F' }}
            />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            className="size-8.5 rounded-full inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('header.exitFullscreen', '退出全屏') : t('header.fullscreen', '全屏显示')}
            data-insightflare-event="fullscreen_toggle"
            data-insightflare-event-to={isFullscreen ? 'off' : 'on'}
          >
            {isFullscreen ? <FiMinimize className="size-4.5" /> : <FiMaximize className="size-4.5" />}
          </button>

          {/* More Tools Popover Menu */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              className={`size-8.5 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                isToolsOpen
                  ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              title="更多功能与设置"
            >
              <FiMoreHorizontal className="size-4.5" />
            </button>

            {/* Floating Tools Dropdown */}
            <AnimatePresence>
              {isToolsOpen && (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -4 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/20 bg-white/85 p-1.5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/90 z-50 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsThemeLibraryOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LuPalette className="size-4 text-primary-500" />
                      <span>{t('theme.title', '字体配色')}</span>
                    </div>
                    <span
                      className="size-3 rounded-full border border-black/15 dark:border-white/20 shadow-xs"
                      style={{ backgroundColor: accentColor || '#10A37F' }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      if (window.location.hash !== '#background') window.location.hash = 'background';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiImage className="size-4 text-purple-500" />
                    <span>{t('header.background', '背景设置')}</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsShareOpen(true);
                      if (window.location.hash !== '#share') window.location.hash = 'share';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiShare2 className="size-4 text-blue-500" />
                    <span>{t('share.title', '分享与二维码')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      transitionTo('todo');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiCheckSquare className="size-4 text-emerald-500" />
                    <span>{t('header.todoPage', '待办清单 (新页面)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      const next = !isWidgetEnabled;
                      setWidgetEnabled(next);
                      if (next) {
                        if (view === 'todo') {
                          transitionTo('main');
                        }
                        window.location.hash = 'todo-widget';
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FiList className="size-4 text-blue-500" />
                      <span>{t('header.todoWidget', '桌面悬浮挂件')}</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isWidgetEnabled
                          ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                          : 'bg-black/5 text-gray-400 dark:bg-white/10 dark:text-gray-500'
                      }`}
                    >
                      {isWidgetEnabled ? t('header.active', '显示中') : t('header.inactive', '已隐藏')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      toggleDock();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FiMaximize className="size-4 text-sky-500" />
                      <span>{t('header.dockBar', '底部 Dock 栏')}</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isDockVisible
                          ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                          : 'bg-black/5 text-gray-400 dark:bg-white/10 dark:text-gray-500'
                      }`}
                    >
                      {isDockVisible ? t('header.active', '显示中') : t('header.inactive', '已隐藏')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsLanguageOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiGlobe className="size-4 text-teal-500" />
                    <span>{t('header.languagePreferences', '语言偏好 / Language')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      openAboutModal('version');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FiInfo className="size-4 text-primary-500" />
                      <span>{t('version.title', '版本与更新')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUpdate && (
                        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                        v{currentVersion}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      openAboutModal('coffee');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FiCoffee className="size-4 text-amber-500" />
                      <span>{t('version.buyMeACoffee', '请作者喝咖啡')}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Coffee
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      openAboutModal('contact');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <SiWechat className="size-4 text-emerald-500" />
                      <span>{t('version.contactAuthor', '联系作者')}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      WeChat
                    </span>
                  </button>

                  <div className="h-px bg-gray-200/60 dark:bg-white/10 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      transitionTo('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiUser className="size-4 text-primary-500" />
                    <span>{t('header.settingsTab', '个人设置中心')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsManageOpen(true);
                      if (window.location.hash !== '#manage') window.location.hash = 'manage';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <FiSettings className="size-4 text-gray-500" />
                    <span>{t('header.manageAllTimers', '管理全部计时器')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Mobile & Pad Top Bar: Refined Minimal Header */}
      <div
        className="lg:hidden flex items-center justify-between px-4 md:px-8 pt-3.5 pb-1 w-full pointer-events-auto bg-transparent"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* Brand Logo with subtle ambient highlight & Quick Timer List Entry */}
        <div className="flex items-center gap-2">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
            className="flex items-center shrink-0 cursor-pointer"
            onClick={() => {
              if (view !== 'main') transitionTo('main');
            }}
          >
            <AnimatedLogo
              color={accentColor || '#f97316'}
              size="md"
              onClick={() => {
                if (view !== 'main') transitionTo('main');
              }}
              onLinkClick={(e) => {
                if (view !== 'main') {
                  e.preventDefault();
                  transitionTo('main');
                }
              }}
            />
          </motion.div>

          {/* 列表 (List of Timers) - Left Side Header Entry */}
          <button
            type="button"
            className="relative inline-flex size-8 items-center justify-center rounded-full bg-white/60 cream:bg-[#faf7ee]/85 dark:bg-white/[0.08] border border-black/[0.06] cream:border-stone-300/40 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.14] shadow-xs backdrop-blur-xl cursor-pointer active:scale-95 transition-all"
            onClick={() => setMobileTab('list')}
            aria-label={t('header.manageShort', '列表')}
            title={t('header.manageShort', '列表')}
          >
            <FiList className="size-3.5" />
            {timers.length > 0 && (
              <span className="absolute -top-1 -right-1 flex min-w-3.5 h-3.5 px-0.5 items-center justify-center rounded-full text-[9px] font-bold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 shadow-xs">
                {timers.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Side: Quick Action Group (Timezone, Share, Settings) */}
        <div className="flex items-center gap-1.5">
          {timezoneInfo && (
            <div
              className="inline-flex h-8 items-center gap-1 px-2.5 rounded-full bg-white/60 cream:bg-[#faf7ee]/85 dark:bg-white/[0.08] border border-black/[0.06] cream:border-stone-300/40 dark:border-white/10 text-[11px] font-medium text-gray-700 dark:text-gray-200 shadow-xs backdrop-blur-xl select-none shrink-0"
              title={`${t('modal.timezone.title', '时区')}: ${timezoneInfo.full}`}
            >
              <FiGlobe className="size-3 shrink-0" style={{ color: accentColor || '#0ea5e9' }} />
              <span className="truncate max-w-[80px] xs:max-w-[120px]">{timezoneInfo.text}</span>
            </div>
          )}

          {/* 分享 (Share & QR Code) */}
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full bg-white/60 cream:bg-[#faf7ee]/85 dark:bg-white/[0.08] border border-black/[0.06] cream:border-stone-300/40 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.14] shadow-xs backdrop-blur-xl cursor-pointer active:scale-95 transition-all"
            onClick={() => setIsShareOpen(true)}
            aria-label="分享"
            title={t('share.title', '分享与二维码')}
          >
            <FiShare2 className="size-3.5" />
          </button>

          {/* 个人设置 (Personal Settings Route) */}
          <button
            type="button"
            className={`relative inline-flex size-8 items-center justify-center rounded-full border border-black/[0.06] cream:border-stone-300/40 dark:border-white/10 shadow-xs backdrop-blur-xl cursor-pointer active:scale-95 transition-all ${
              view === 'settings'
                ? 'bg-black/10 dark:bg-white/20 text-gray-900 dark:text-white'
                : 'bg-white/60 cream:bg-[#faf7ee]/85 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/[0.14]'
            }`}
            onClick={() => {
              transitionTo('settings');
              setMobileTab('settings');
            }}
            aria-label={t('header.settingsTab', '个人设置')}
            title={t('header.settingsTab', '个人设置')}
          >
            <FiSettings className="size-3.5" />
            {hasUpdate && (
              <span className="absolute top-0 right-0 size-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* 管理计时器弹窗 */}
      <AutoTransition portal transitionKey={isManageOpen ? 'manage-open' : 'manage-closed'} initial={false} type="fade">
        {isManageOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 p-4 backdrop-blur-sm flex items-center justify-center z-50 overflow-x-hidden overflow-y-auto"
            onClick={() => {
              setIsManageOpen(false);
              setEditingTimer(null);
              if (window.location.hash === '#manage') {
                window.location.hash = '';
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 rounded-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto"
              onClick={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-4">
                <h2 className="text-xl font-semibold">{t('header.manage')}</h2>
                <button
                  className="p-1 rounded-full btn-ghost cursor-pointer"
                  onClick={() => {
                    setIsManageOpen(false);
                    setEditingTimer(null);
                    if (window.location.hash === '#manage') {
                      window.location.hash = '';
                    }
                  }}
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <AutoResizer initial={false} overflow="hidden">
              <LinearDialogTransition transitionKey={editingTimer ? `editing-${editingTimer.id}` : 'timer-list'} direction={manageDirection}>
              {editingTimer ? (
                <div className="flex flex-col gap-4">
                  <h3 className="font-medium pb-2">
                    {editingTimer.isLimitedEdit ? t('modal.edit.editTimer') : t('modal.edit.editCountdown')}
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('modal.edit.name')}</label>
                    <input
                      type="text"
                      value={editingTimer.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingTimer({...editingTimer, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  {/* 只有倒计时可以编辑日期和时间 */}
                  {!editingTimer.isLimitedEdit && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">{t('modal.edit.date')}</label>
                        <input
                          type="date"
                          value={editingTimer.targetDate}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingTimer({...editingTimer, targetDate: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">{t('modal.edit.time')}</label>
                        <input
                          type="time"
                          value={editingTimer.targetTime}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingTimer({...editingTimer, targetTime: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">{t('modal.edit.color')}</label>
                    <div 
                      className="h-10 w-full rounded-lg cursor-pointer"
                      style={{ backgroundColor: editingTimer.color }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    ></div>
                    {showColorPicker && (
                      <div className="pt-2 space-y-3">
                        <Suspense fallback={<div className="h-44 w-full animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />}>
                          <HexColorPicker 
                            color={editingTimer.color} 
                            onChange={(color) => setEditingTimer({...editingTimer, color})} 
                            className="w-full"
                          />
                        </Suspense>
                        <div className="grid grid-cols-5 gap-2 pt-1">
                          {PRESET_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-full aspect-square rounded-full border border-white/60 dark:border-white/20 transition-transform hover:scale-105 ${editingTimer.color === color ? 'ring-2 ring-primary-500' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditingTimer({ ...editingTimer, color })}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      className="flex-1 btn-glass-secondary"
                      onClick={() => {
                        setManageDirection(-1);
                        setEditingTimer(null);
                      }}
                    >
                      {t('common.previous')}
                    </button>
                    <button
                      className="flex-1 btn-glass-primary flex items-center justify-center"
                      onClick={saveEditedTimer}
                      data-insightflare-event="timer_edit_save"
                    >
                      <FiSave className="mr-2" />
                      {t('modal.edit.saveChanges')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <div className="max-h-96 overflow-y-auto">
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={orderedTimerIds}
                    onReorder={handleTimerReorder}
                    className="flex flex-col gap-2"
                  >
                    {orderedTimerIds
                      .map((id) => timersById.get(id))
                      .filter((timer): timer is Timer => timer !== undefined)
                      .map((timer) => (
                        <TimerManageRow
                          key={timer.id}
                          timer={timer}
                          summary={timer.type === 'stopwatch'
                            ? t('timer.stopwatch')
                            : timer.type === 'worldclock'
                              ? `${timer.country || t('timer.worldClock')} - ${timer.timezone || ''}`
                              : new Date(timer.targetDate).toLocaleString()}
                          dragLabel={t('header.dragToReorder', '拖动以调整顺序')}
                          onEdit={startEditTimer}
                          onDelete={deleteTimer}
                          onDragEnd={handleTimerReorderEnd}
                        />
                      ))}
                  </Reorder.Group>
                </div>
                <div className="flex justify-start pt-4">
                  <button
                    className="btn-glass-secondary"
                    onClick={() => {
                      setIsManageOpen(false);
                      setEditingTimer(null);
                      if (window.location.hash === '#manage') {
                        window.location.hash = '';
                      }
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
                </>
              )}
              </LinearDialogTransition>
              </AutoResizer>
            </motion.div>
          </motion.div>
        ) : null}
      </AutoTransition>

      {/* 语言切换弹窗 */}
      <AutoTransition portal transitionKey={isLanguageOpen ? 'language-open' : 'language-closed'} initial={false} type="fade">
        {isLanguageOpen ? (
                        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setIsLanguageOpen(false)}
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 12 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card w-full max-w-md m-4 p-6 sm:p-7 rounded-3xl shadow-2xl border border-white/30 dark:border-white/10 backdrop-blur-2xl"
              onClick={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              {/* Header with international Globe Icon */}
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
                    <FiGlobe className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {t('header.languagePreferences', '语言偏好 / Language')}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('header.languageDescription', '选择界面的显示语言，设置将即时生效')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  onClick={() => setIsLanguageOpen(false)}
                  aria-label={t('common.close', '关闭')}
                >
                  <FiX className="size-5" />
                </button>
              </div>

              {/* Language Options List */}
              <div className="space-y-2.5">
                {/* 简体中文 (Chinese Simplified) */}
                <button
                  type="button"
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
                    currentLang === 'zh-CN'
                      ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-500/15 ring-2 ring-primary-500/25 shadow-xs'
                      : 'border-black/6 bg-white/40 hover:bg-white/80 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                  onClick={() => switchLanguage('zh-CN')}
                  data-insightflare-event="language_change"
                  data-insightflare-event-lang="zh-CN"
                >
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                      简体中文
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('header.chineseDesc', '中文 (简体) · zh-CN')}
                    </span>
                  </div>

                  {currentLang === 'zh-CN' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold shadow-xs">
                      <FiCheck className="size-3.5 stroke-[3]" />
                      <span>{t('header.currentActive', '当前使用')}</span>
                    </div>
                  ) : (
                    <span className="size-5 rounded-full border border-gray-300 dark:border-gray-600 group-hover:border-primary-400 transition-colors" />
                  )}
                </button>

                {/* English (United States) */}
                <button
                  type="button"
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
                    currentLang === 'en-US'
                      ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-500/15 ring-2 ring-primary-500/25 shadow-xs'
                      : 'border-black/6 bg-white/40 hover:bg-white/80 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                  onClick={() => switchLanguage('en-US')}
                  data-insightflare-event="language_change"
                  data-insightflare-event-lang="en-US"
                >
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight font-sans">
                      English
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('header.englishDesc', 'English (United States) · en-US')}
                    </span>
                  </div>

                  {currentLang === 'en-US' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold shadow-xs">
                      <FiCheck className="size-3.5 stroke-[3]" />
                      <span>{t('header.currentActive', 'Active')}</span>
                    </div>
                  ) : (
                    <span className="size-5 rounded-full border border-gray-300 dark:border-gray-600 group-hover:border-primary-400 transition-colors" />
                  )}
                </button>
              </div>

              {/* Bottom cancel action */}
              <div className="flex justify-end pt-5">
                <button
                  type="button"
                  className="px-5 py-2 rounded-xl text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setIsLanguageOpen(false)}
                >
                  {t('common.cancel', '取消')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AutoTransition>

      {isTimerCreationOpen && (
        <Suspense fallback={null}>
          <TimerCreationFlow
            open={isTimerCreationOpen}
            onOpenChange={setIsTimerCreationOpen}
          />
        </Suspense>
      )}

      {/* 分享模态框 */}
      <AutoTransition portal transitionKey={isShareOpen ? 'share-open' : 'share-closed'} initial={false} type="fade">
        {isShareOpen ? (
          <Suspense fallback={null}>
            <ShareModal onClose={() => {
              setIsShareOpen(false);
              if (window.location.hash === '#share') {
                window.location.hash = '';
              }
            }} />
          </Suspense>
        ) : null}
      </AutoTransition>
    </motion.header>

    {/* Mobile Bottom TabBar with iOS Liquid Droplet Capsule Animation */}
    <MobileTabBar
      activeTab={
        mobileTab === 'list'
          ? 'list'
          : view === 'cheer'
          ? 'cheer'
          : view === 'todo'
          ? 'todo'
          : view === 'settings'
          ? 'settings'
          : 'timer'
      }
      onTabChange={(tab) => {
        if (tab === 'cheer') {
          transitionTo('cheer');
          setMobileTab('cheer');
        } else if (tab === 'timer') {
          transitionTo('main');
          setMobileTab('timer');
        } else if (tab === 'todo') {
          transitionTo('todo');
          setMobileTab('todo');
        } else if (tab === 'settings') {
          transitionTo('settings');
          setMobileTab('settings');
        } else {
          setMobileTab(tab);
        }
      }}
      timers={timers}
      activeTimerId={activeTimerId}
      setActiveTimerId={setActiveTimerId}
      onOpenAdd={() => {
        setIsTimerCreationOpen(true);
        if (window.location.hash !== '#add') window.location.hash = 'add';
      }}
      onOpenBackground={() => {
        if (window.location.hash !== '#background') window.location.hash = 'background';
      }}
      onOpenFullscreenSettings={() => {
        if (window.location.hash !== '#fullscreen-settings') window.location.hash = 'fullscreen-settings';
      }}
      onOpenShare={() => {
        setIsShareOpen(true);
        if (window.location.hash !== '#share') window.location.hash = 'share';
      }}
      theme={theme}
      toggleTheme={toggleTheme}
      isFullscreen={isFullscreen}
      toggleFullscreen={toggleFullscreen}
      accentColor={accentColor}
      isVisible={!isFullscreen || isHeaderVisible}
      deleteTimer={deleteTimer}
      updateTimer={updateTimer}
      reorderTimers={reorderTimers}
    />

    {/* Desktop Apple-Style Web Dock */}
    {isDockVisible && (
      <WebDock
        onOpenAdd={() => {
          setIsTimerCreationOpen(true);
          if (window.location.hash !== '#add') window.location.hash = 'add';
        }}
        onOpenManage={() => {
          setIsManageOpen(true);
          if (window.location.hash !== '#manage') window.location.hash = 'manage';
        }}
        onOpenBackground={() => {
          if (window.location.hash !== '#background') window.location.hash = 'background';
        }}
        onOpenShare={() => {
          setIsShareOpen(true);
          if (window.location.hash !== '#share') window.location.hash = 'share';
        }}
        onOpenThemeLibrary={() => setIsThemeLibraryOpen(true)}
      />
    )}

    {/* Theme Color Palette Library Modal */}
    <ThemeLibraryModal
      isOpen={isThemeLibraryOpen}
      onClose={() => setIsThemeLibraryOpen(false)}
    />
  </>
  );
}

