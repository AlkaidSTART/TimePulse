import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import type { ChangeEvent } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls, useReducedMotion } from 'framer-motion';
import {
  FiClock,
  FiPlus,
  FiUser,
  FiX,
  FiEdit,
  FiSave,
  FiCheck,
  FiCheckSquare,
} from 'react-icons/fi';
import { LuSmile } from 'react-icons/lu';
import { RxDragHandleDots2 } from 'react-icons/rx';
import type { CountdownTimer, Timer, TimerType } from '@/domain/timer';
import { useTranslation } from '@/i18n/useTranslation';
import { PRESET_COLORS } from '@/constants/colors';

// 日期选择器与取色器仅在编辑计时器时用到：懒加载以移出首屏
const DatePicker = lazy(() => import('@/components/composed/DatePicker'));
const HexColorPicker = lazy(() => import('react-colorful').then((m) => ({ default: m.HexColorPicker })));

export type MobileTab = 'cheer' | 'timer' | 'todo' | 'list' | 'background' | 'settings';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  timers: Timer[];
  activeTimerId: string | null;
  setActiveTimerId: (id: string) => void;
  onOpenAdd: () => void;
  onOpenBackground: () => void;
  onOpenFullscreenSettings?: () => void;
  onOpenShare: () => void;
  theme: 'light' | 'cream';
  toggleTheme: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  accentColor: string;
  isVisible: boolean;
  deleteTimer: (id: string) => void;
  updateTimer: (id: string, updated: any) => void;
  reorderTimers: (order: string[]) => void;
}

type TimerEditState = {
  id: string;
  name: string;
  color?: string;
  type?: TimerType;
  countdownType?: 'long' | 'short';
  durationSeconds?: number;
  shortHours?: number;
  shortMinutes?: number;
  shortSeconds?: number;
  targetDate?: string;
  targetTime?: string;
  isLimitedEdit?: boolean;
};

// Reorderable row for mobile timer list sheet
function MobileTimerRow({
  timer,
  isActive,
  summary,
  t,
  onSelect,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  timer: Timer;
  isActive: boolean;
  summary: string;
  t: (key: string, defaultValue?: string) => string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
      whileDrag={{ scale: 1.02, boxShadow: '0 16px 32px -4px rgba(0, 0, 0, 0.15)', zIndex: 50 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-200 ${
        isActive
          ? 'border-black/15 bg-white/95 cream:bg-white/90 cream:border-stone-400/50 dark:border-white/20 dark:bg-white/[0.12] shadow-xs'
          : 'border-black/[0.06] bg-white/60 hover:bg-white/80 cream:bg-white/70 cream:border-stone-300/40 dark:border-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
      } backdrop-blur-xl`}
    >
      {/* Visual Accent Pill on Left */}
      <span
        className="shrink-0 w-2 h-10 sm:h-11 rounded-full shadow-xs"
        style={{ backgroundColor: timer.color || '#0ea5e9' }}
      />

      {/* Drag handle */}
      <button
        type="button"
        className="inline-flex size-8.5 sm:size-9.5 shrink-0 touch-none cursor-grab items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        onPointerDown={(e) => dragControls.start(e)}
        aria-label={t('mobileNav.dragToReorder', '拖动排序')}
      >
        <RxDragHandleDots2 className="size-5 text-current" />
      </button>

      {/* Timer Info - Tap to select */}
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <h4 className="truncate font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 tracking-tight">
            {timer.name}
          </h4>
          {isActive && (
            <span
              className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-white px-2.5 py-0.5 rounded-full shadow-xs"
              style={{ backgroundColor: timer.color || '#0ea5e9' }}
            >
              <FiCheck className="size-3 stroke-[2.8]" />
              {t('mobileNav.current', '当前')}
            </span>
          )}
        </div>
        <p className="truncate text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {summary}
        </p>
      </button>

      {/* Actions: Subtle frosted icon buttons */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex size-8.5 sm:size-9.5 items-center justify-center rounded-full bg-black/[0.04] text-gray-600 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.14] cursor-pointer active:scale-95 transition-all"
          title={t('mobileNav.edit', '编辑')}
        >
          <FiEdit className="size-4 sm:size-4.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex size-8.5 sm:size-9.5 items-center justify-center rounded-full bg-black/[0.04] text-gray-600 hover:bg-red-500/10 hover:text-red-500 dark:bg-white/[0.08] dark:text-gray-300 dark:hover:bg-red-500/20 dark:hover:text-red-400 cursor-pointer active:scale-95 transition-all"
          title={t('mobileNav.delete', '删除')}
        >
          <FiX className="size-4 sm:size-4.5" />
        </button>
      </div>
    </Reorder.Item>
  );
}

export default function MobileTabBar({
  activeTab,
  onTabChange,
  timers,
  activeTimerId,
  setActiveTimerId,
  onOpenAdd,
  onOpenBackground,
  onOpenFullscreenSettings,
  onOpenShare,
  theme,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
  accentColor,
  isVisible,
  deleteTimer,
  updateTimer,
  reorderTimers,
}: MobileTabBarProps) {
  const { t } = useTranslation();
  const [prevTab, setPrevTab] = useState<MobileTab>(activeTab);
  const [editingTimer, setEditingTimer] = useState<TimerEditState | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [timerOrder, setTimerOrder] = useState(() => timers.map((t) => t.id));
  const timerOrderRef = useRef(timerOrder);

  useEffect(() => {
    if (activeTab === 'timer' || activeTab === 'todo' || activeTab === 'cheer' || activeTab === 'settings') {
      setPrevTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    const previousOrder = timerOrderRef.current;
    const availableIds = new Set(timers.map((timer) => timer.id));
    const nextOrder = previousOrder.filter((id) => availableIds.has(id));
    const orderedIds = new Set(nextOrder);
    for (const timer of timers) {
      if (!orderedIds.has(timer.id)) {
        nextOrder.push(timer.id);
        orderedIds.add(timer.id);
      }
    }
    timerOrderRef.current = nextOrder;
    // 顺序没有实际变化时跳过 setState，避免每次 timers 引用变化都触发重渲染
    const orderChanged =
      nextOrder.length !== previousOrder.length ||
      nextOrder.some((id, index) => id !== previousOrder[index]);
    if (orderChanged) {
      setTimerOrder(nextOrder);
    }
  }, [timers]);

  const handleTimerReorder = (nextOrder: string[]) => {
    timerOrderRef.current = nextOrder;
    setTimerOrder(nextOrder);
  };

  const handleTimerReorderEnd = () => {
    reorderTimers(timerOrderRef.current);
  };

  const handleTabClick = (tab: MobileTab) => {
    setPrevTab(activeTab);

    if (tab === 'background') {
      onOpenBackground();
      return;
    }

    onTabChange(tab);
  };

  const handleAddClick = () => {
    onOpenAdd();
  };

  const handleCloseSheet = () => {
    onTabChange(prevTab);
  };

  useEffect(() => {
    if (activeTab !== 'list') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseSheet();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, prevTab]);

  const startEditTimer = (timer: Timer) => {
    if (timer.type === 'countdown' || !timer.type) {
      const cd = timer as CountdownTimer;
      const duration = typeof cd.durationSeconds === 'number' ? cd.durationSeconds : 0;
      const h = Math.floor(duration / 3600);
      const m = Math.floor((duration % 3600) / 60);
      const s = duration % 60;

      setEditingTimer({
        ...timer,
        countdownType: cd.countdownType ?? 'long',
        durationSeconds: duration,
        shortHours: h,
        shortMinutes: m,
        shortSeconds: s,
        targetDate: new Date(timer.targetDate).toISOString().substring(0, 10),
        targetTime: new Date(timer.targetDate).toTimeString().substring(0, 5),
        isLimitedEdit: false,
      });
    } else {
      setEditingTimer({
        id: timer.id,
        name: timer.name,
        color: timer.color,
        type: timer.type,
        isLimitedEdit: true,
      });
    }
  };

  const saveEditedTimer = () => {
    if (!editingTimer) return;
    if (editingTimer.isLimitedEdit) {
      updateTimer(editingTimer.id, {
        name: editingTimer.name,
        color: editingTimer.color,
      });
    } else if (editingTimer.countdownType === 'short') {
      const totalSecs = (Number(editingTimer.shortHours) || 0) * 3600 +
                        (Number(editingTimer.shortMinutes) || 0) * 60 +
                        (Number(editingTimer.shortSeconds) || 0);
      const targetDateObj = new Date(Date.now() + totalSecs * 1000);
      updateTimer(editingTimer.id, {
        name: editingTimer.name,
        durationSeconds: totalSecs,
        targetDate: targetDateObj.toISOString(),
        color: editingTimer.color,
      });
    } else {
      const targetDateObj = new Date(`${editingTimer.targetDate}T${editingTimer.targetTime}`);
      updateTimer(editingTimer.id, {
        name: editingTimer.name,
        targetDate: targetDateObj.toISOString(),
        color: editingTimer.color,
      });
    }
    setEditingTimer(null);
    setShowColorPicker(false);
  };

  const shouldReduceMotion = useReducedMotion();

  // Minimal smooth spring physics
  const tabSpring = shouldReduceMotion
    ? { duration: 0 }
    : {
        type: 'spring' as const,
        stiffness: 450,
        damping: 32,
      };

  const tabsConfig = [
    { id: 'cheer' as MobileTab, label: t('header.cheerShort', '打气'), icon: LuSmile },
    { id: 'timer' as MobileTab, label: t('header.timersShort', '计时'), icon: FiClock },
    { id: 'add' as const, label: t('header.newTimer', '新建'), icon: FiPlus, isAction: true },
    { id: 'todo' as MobileTab, label: t('header.todoShort', '待办'), icon: FiCheckSquare },
    { id: 'settings' as MobileTab, label: t('header.settingsTab', '个人设置'), icon: FiUser },
  ];

  const timersById = new Map(timers.map((t) => [t.id, t]));
  const orderedTimerIds = [
    ...timerOrder.filter((id) => timersById.has(id)),
    ...timers.map((t) => t.id).filter((id) => !timerOrder.includes(id)),
  ];

  return (
    <>
      {/* Floating Bottom TabBar Container - VisionOS / Dynamic Island Style Floating Dock */}
      <motion.nav
        data-page-transition-ignore="true"
        aria-label="移动端底部导航"
        initial={false}
        animate={{
          y: isVisible ? 0 : 96,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 sm:bottom-4 landscape:bottom-1.5 inset-x-3 z-40 lg:hidden max-w-[420px] sm:max-w-[500px] md:max-w-[560px] landscape:max-w-[380px] mx-auto pointer-events-auto"
        style={{
          paddingBottom: 'max(0px, var(--tp-safe-bottom, env(safe-area-inset-bottom, 0px)))',
          paddingLeft: 'var(--tp-safe-left, env(safe-area-inset-left, 0px))',
          paddingRight: 'var(--tp-safe-right, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="ios-liquid-glass-dock relative mx-auto flex h-[70px] sm:h-[76px] landscape:h-[48px] w-full items-center justify-around rounded-full p-1.5 overflow-hidden">
          {tabsConfig.map((item) => {
            if (item.isAction) {
              // Center Action: "+" Button - Clean Ultra-Transparent Button (No Reflections)
              return (
                <div key={item.id} className="relative flex flex-1 h-full items-center justify-center px-0.5">
                  <motion.button
                    type="button"
                    onClick={handleAddClick}
                    whileTap={{ scale: 0.92 }}
                    className="liquid-droplet-button relative flex size-12.5 sm:size-14 landscape:size-9.5 items-center justify-center rounded-full text-gray-950 dark:text-white cursor-pointer transition-all focus:outline-none overflow-hidden select-none"
                    aria-label="新建计时器"
                  >
                    <FiPlus className="size-6 sm:size-7 landscape:size-4.5 stroke-[2.4] text-gray-950 dark:text-white relative z-10" />
                  </motion.button>
                </div>
              );
            }

            const tab = item.id as MobileTab;
            const isActive = activeTab === tab;
            const Icon = item.icon;

            return (
              <div key={tab} className="relative flex flex-1 h-full items-center justify-center px-0.5">
                <motion.button
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  whileTap={{ scale: 0.94 }}
                  className="relative flex flex-col items-center justify-center w-full h-full rounded-full cursor-pointer focus:outline-none select-none transition-colors duration-200"
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Ultra-Transparent Active Indicator (Zero Reflections) */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-tab-indicator"
                      className="liquid-droplet-pill absolute inset-y-0.5 inset-x-0.5 rounded-full pointer-events-none overflow-hidden"
                      transition={tabSpring}
                    >
                      <div className="hidden" aria-hidden="true" />
                      <div className="hidden" aria-hidden="true" />
                    </motion.div>
                  )}

                  {/* Content: Icon + Label (Clean & High Contrast, Zero Reflections) */}
                  <motion.div
                    className="relative z-10 flex flex-col items-center justify-center gap-1 sm:gap-1.5 landscape:gap-0.5"
                    animate={isActive ? { scale: [0.96, 1.04, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <div className="relative">
                      <Icon
                        className={`size-5 sm:size-6 landscape:size-[16px] transition-colors duration-200 ${
                          isActive
                            ? 'stroke-[2.4] text-gray-950 dark:text-white'
                            : 'stroke-[1.8] text-stone-600 hover:text-stone-900 dark:text-gray-300 dark:hover:text-white'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs landscape:text-[9px] tracking-tight transition-colors duration-200 whitespace-nowrap ${
                        isActive
                          ? 'font-bold text-gray-950 dark:text-white'
                          : 'font-medium text-stone-600 dark:text-gray-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </motion.button>
              </div>
            );
          })}
        </div>
      </motion.nav>

      {/* iOS-Style Bottom Sheet: 列表 (Timers List & Management) */}
      <AnimatePresence>
        {activeTab === 'list' && (
          <div data-page-transition-ignore="true" className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleCloseSheet}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 360 }}
              className="relative z-10 flex max-h-[90vh] flex-col rounded-t-[32px] md:rounded-[32px] md:max-w-xl md:w-full md:mx-auto md:mb-6 border-t md:border border-black/[0.06] bg-white/92 px-4.5 pt-3 pb-[max(1.5rem,var(--tp-safe-bottom,env(safe-area-inset-bottom,0px)))] shadow-2xl backdrop-blur-3xl cream:bg-[#faf7ee]/95 cream:border-stone-300/50 dark:border-white/[0.08] dark:bg-[#141416]/95"
            >
              {/* Grab Bar */}
              <div className="mx-auto h-1 w-9 rounded-full bg-black/15 cream:bg-stone-400/30 dark:bg-white/20 mb-2.5" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] cream:border-stone-200/60 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-display tracking-tight">
                    全部计时器
                  </h3>
                  <span
                    className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accentColor || '#0ea5e9'} 14%, transparent)`,
                      color: accentColor || '#0ea5e9',
                    }}
                  >
                    {timers.length} 个
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAdd();
                    }}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                    style={{ backgroundColor: accentColor || '#0ea5e9' }}
                  >
                    <FiPlus className="size-4 sm:size-4.5 stroke-[2.4]" />
                    新建
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseSheet}
                    className="size-8.5 sm:size-9.5 inline-flex items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-gray-500 dark:text-gray-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.14] cursor-pointer active:scale-95 transition-all"
                    aria-label="关闭"
                  >
                    <FiX className="size-4.5 sm:size-5" />
                  </button>
                </div>
              </div>

              {/* Sheet Body: Editing or List */}
              <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                {editingTimer ? (
                  <div className="flex flex-col gap-4 p-1">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        {editingTimer.isLimitedEdit
                          ? '编辑计时器'
                          : editingTimer.countdownType === 'short'
                          ? '编辑短期倒计时'
                          : '编辑长期倒计时'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setEditingTimer(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        返回列表
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        名称
                      </label>
                      <input
                        type="text"
                        value={editingTimer.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setEditingTimer({ ...editingTimer, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>

                    {!editingTimer.isLimitedEdit && (
                      editingTimer.countdownType === 'short' ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            倒计时时长
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-[10px] text-gray-400 block mb-0.5">小时</span>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={editingTimer.shortHours ?? 0}
                                onChange={(e) =>
                                  setEditingTimer({
                                    ...editingTimer,
                                    shortHours: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-center font-mono text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block mb-0.5">分钟</span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={editingTimer.shortMinutes ?? 0}
                                onChange={(e) =>
                                  setEditingTimer({
                                    ...editingTimer,
                                    shortMinutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-center font-mono text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block mb-0.5">秒</span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={editingTimer.shortSeconds ?? 0}
                                onChange={(e) =>
                                  setEditingTimer({
                                    ...editingTimer,
                                    shortSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-center font-mono text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              目标日期
                            </label>
                            <Suspense fallback={null}>
                              <DatePicker
                                value={editingTimer.targetDate}
                                onChange={(e) =>
                                  setEditingTimer({ ...editingTimer, targetDate: e.target.value })
                                }
                                triggerClassName="rounded-xl bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-sm h-auto py-2 px-3"
                              />
                            </Suspense>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              目标时间
                            </label>
                            <input
                              type="time"
                              value={editingTimer.targetTime}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setEditingTimer({ ...editingTimer, targetTime: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        主题颜色
                      </label>
                      <div
                        className="h-9 w-full rounded-xl cursor-pointer border border-white/20 shadow-xs"
                        style={{ backgroundColor: editingTimer.color }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      />
                      {showColorPicker && (
                        <div className="pt-2 space-y-3">
                          <Suspense fallback={null}>
                            <HexColorPicker
                              color={editingTimer.color}
                              onChange={(color) => setEditingTimer({ ...editingTimer, color })}
                              className="w-full !w-full"
                            />
                          </Suspense>
                          <div className="grid grid-cols-5 gap-2 pt-1">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`w-full aspect-square rounded-full border border-white/60 dark:border-white/20 transition-transform active:scale-95 ${editingTimer.color === color ? 'ring-2 ring-primary-500' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setEditingTimer({ ...editingTimer, color })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingTimer(null)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200/60 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveEditedTimer}
                        className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <FiSave className="size-4" />
                        保存更改
                      </button>
                    </div>
                  </div>
                ) : (
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={orderedTimerIds}
                    onReorder={handleTimerReorder}
                    className="flex flex-col gap-2.5 pb-4"
                  >
                    {orderedTimerIds
                      .map((id) => timersById.get(id))
                      .filter((timer): timer is Timer => timer !== undefined)
                      .map((timer) => (
                        <MobileTimerRow
                          key={timer.id}
                          timer={timer}
                          isActive={timer.id === activeTimerId}
                          summary={
                            timer.type === 'stopwatch'
                              ? '秒表 / 正计时'
                              : timer.type === 'worldclock'
                              ? `${timer.country || '世界时钟'} · ${timer.timezone || ''}`
                              : new Date(timer.targetDate).toLocaleString()
                          }
                          onSelect={() => {
                            setActiveTimerId(timer.id);
                            onTabChange('timer');
                          }}
                          onEdit={() => startEditTimer(timer)}
                          onDelete={() => deleteTimer(timer.id)}
                          onDragEnd={handleTimerReorderEnd}
                        />
                      ))}
                  </Reorder.Group>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}

