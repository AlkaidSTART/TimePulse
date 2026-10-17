import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import {
  FiClock,
  FiList,
  FiPlus,
  FiImage,
  FiSettings,
  FiX,
  FiEdit,
  FiSave,
  FiSun,
  FiCoffee,
  FiMaximize,
  FiMinimize,
  FiGlobe,
  FiShare2,
  FiCheck,
  FiCheckSquare,
  FiInfo,
  FiChevronRight,
  FiPalette,
} from 'react-icons/fi';
import { RxDragHandleDots2 } from 'react-icons/rx';
import type { Timer, TimerType } from '@/domain/timer';
import { useTranslation } from '@/i18n/useTranslation';
import type { Language } from '@/i18n/types';
import { HexColorPicker } from 'react-colorful';
import { PRESET_COLORS } from '@/constants/colors';
import { useTodoStore, useVersionStore } from '@/stores';
import ThemeLibraryModal from '@/components/composed/ThemeLibraryModal';


export type MobileTab = 'timer' | 'todo' | 'list' | 'background' | 'settings';

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
  targetDate?: string;
  targetTime?: string;
  isLimitedEdit?: boolean;
};

// Reorderable row for mobile timer list sheet
function MobileTimerRow({
  timer,
  isActive,
  summary,
  onSelect,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  timer: Timer;
  isActive: boolean;
  summary: string;
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
      className={`group relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all duration-200 ${
        isActive
          ? 'border-primary-500/50 bg-primary-500/10 dark:bg-primary-500/20 ring-1 ring-primary-500/25 shadow-sm'
          : 'border-white/20 bg-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
      } backdrop-blur-md`}
      style={{ borderLeftWidth: '4px', borderLeftColor: timer.color || '#0ea5e9' }}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="inline-flex size-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
        onPointerDown={(e) => dragControls.start(e)}
        aria-label="拖动排序"
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
          <h4 className="truncate font-medium text-sm text-gray-900 dark:text-gray-100">
            {timer.name}
          </h4>
          {isActive && (
            <span
              className="flex items-center gap-1 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full shadow-xs"
              style={{ backgroundColor: timer.color || '#0ea5e9' }}
            >
              <FiCheck className="size-3 stroke-[2.5]" />
              当前
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {summary}
        </p>
      </button>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex size-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 cursor-pointer transition-colors"
          title="编辑"
        >
          <FiEdit className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex size-8 items-center justify-center rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:bg-red-500/15 dark:text-red-400 cursor-pointer transition-colors"
          title="删除"
        >
          <FiX className="size-3.5" />
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
  const { t, changeLanguage, currentLang } = useTranslation();
  const [prevTab, setPrevTab] = useState<MobileTab>(activeTab);
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const [editingTimer, setEditingTimer] = useState<TimerEditState | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isThemeLibraryOpen, setIsThemeLibraryOpen] = useState(false);
  const [timerOrder, setTimerOrder] = useState(() => timers.map((t) => t.id));
  const timerOrderRef = useRef(timerOrder);
  const isWidgetEnabled = useTodoStore((s) => s.isWidgetEnabled);
  const setWidgetEnabled = useTodoStore((s) => s.setWidgetEnabled);
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);
  const openAboutModal = useVersionStore((s) => s.openAboutModal);

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
    timerOrderRef.current = nextOrder;
    setTimerOrder(nextOrder);
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
    setClickedTab(tab);
    setTimeout(() => setClickedTab(null), 500);

    if (tab === 'background') {
      onOpenBackground();
      return;
    }

    onTabChange(tab);
  };

  const handleAddClick = () => {
    setClickedTab('add');
    setTimeout(() => setClickedTab(null), 500);
    onOpenAdd();
  };

  const startEditTimer = (timer: Timer) => {
    if (timer.type === 'countdown' || !timer.type) {
      setEditingTimer({
        ...timer,
        targetDate: new Date(timer.targetDate).toISOString().substring(0, 10),
        targetTime: new Date(timer.targetDate).toTimeString().substring(0, 5),
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

  // Minimal smooth spring physics
  const tabSpring = {
    type: 'spring' as const,
    stiffness: 450,
    damping: 32,
  };

  const tabsConfig = [
    { id: 'timer' as MobileTab, label: t('header.timersShort', '计时'), icon: FiClock },
    { id: 'todo' as MobileTab, label: t('header.todoShort', '待办'), icon: FiCheckSquare },
    { id: 'add' as const, label: t('header.newTimer', '新建'), icon: FiPlus, isAction: true },
    { id: 'list' as MobileTab, label: t('header.manageShort', '列表'), icon: FiList, badge: timers.length },
    { id: 'settings' as MobileTab, label: t('header.settingsShort', '设置'), icon: FiSettings },
  ];

  const timersById = new Map(timers.map((t) => [t.id, t]));
  const orderedTimerIds = [
    ...timerOrder.filter((id) => timersById.has(id)),
    ...timers.map((t) => t.id).filter((id) => !timerOrder.includes(id)),
  ];

  return (
    <>
      {/* Floating Bottom TabBar Container - Clean minimalist dock without halos */}
      <motion.nav
        data-page-transition-ignore="true"
        aria-label="移动端底部导航"
        initial={false}
        animate={{
          y: isVisible ? 0 : 96,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 inset-x-3 z-40 md:hidden max-w-[420px] mx-auto pointer-events-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="relative mx-auto flex h-[58px] w-full items-center justify-around rounded-full border border-black/[0.08] bg-white/90 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#18181B]/90 dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {tabsConfig.map((item) => {
            if (item.isAction) {
              // Center Action: "+" Button - Modern solid minimalist button
              return (
                <div key={item.id} className="relative flex flex-1 items-center justify-center px-1">
                  <motion.button
                    type="button"
                    onClick={handleAddClick}
                    whileTap={{ scale: 0.92 }}
                    className="relative flex size-10.5 items-center justify-center rounded-full text-white shadow-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white cursor-pointer"
                    style={{
                      backgroundColor: accentColor || '#10A37F',
                    }}
                    aria-label="新建计时器"
                  >
                    <FiPlus className="size-5 stroke-[2.3]" />
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
                  className="relative flex flex-col items-center justify-center w-full h-full rounded-full cursor-pointer focus:outline-none transition-colors duration-200 select-none"
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Clean active tab capsule indicator without blur glow */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-tab-indicator"
                      className="absolute inset-1 rounded-full pointer-events-none shadow-xs"
                      style={{
                        backgroundColor: accentColor || '#10A37F',
                      }}
                      transition={tabSpring}
                    />
                  )}

                  {/* Content: Icon + Label */}
                  <motion.div
                    className="relative z-10 flex flex-col items-center justify-center gap-0.5"
                    animate={isActive ? { scale: [0.96, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <div className="relative">
                      <Icon
                        className={`size-[18px] transition-colors duration-150 ${
                          isActive
                            ? 'text-white stroke-[2.2]'
                            : 'text-gray-500 dark:text-gray-400 stroke-[1.8]'
                        }`}
                      />
                      {/* Badge if present */}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`absolute -top-1.5 -right-2 flex size-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
                            isActive
                              ? 'bg-white text-gray-900 shadow-xs'
                              : 'bg-primary-500 text-white shadow-xs'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] tracking-tight transition-colors duration-150 whitespace-nowrap ${
                        isActive
                          ? 'font-semibold text-white'
                          : 'font-medium text-gray-500 dark:text-gray-400'
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
          <div data-page-transition-ignore="true" className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => onTabChange('timer')}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 360 }}
              className="relative z-10 flex max-h-[82vh] flex-col rounded-t-[28px] border-t border-white/20 bg-white/80 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85"
            >
              {/* Grab Bar */}
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-400/40 dark:bg-gray-600/60 mb-3" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                    全部计时器
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-semibold">
                    {timers.length} 个
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAdd();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-500 text-white text-xs font-semibold shadow-xs hover:bg-primary-600 transition-colors cursor-pointer"
                  >
                    <FiPlus className="size-3.5" />
                    新建
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange('timer')}
                    className="size-8 inline-flex items-center justify-center rounded-full bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 cursor-pointer transition-colors"
                  >
                    <FiX className="size-4" />
                  </button>
                </div>
              </div>

              {/* Sheet Body: Editing or List */}
              <div className="mt-4 flex-1 overflow-y-auto min-h-0">
                {editingTimer ? (
                  <div className="flex flex-col gap-4 p-1">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        {editingTimer.isLimitedEdit ? '编辑计时器' : '编辑倒计时'}
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            目标日期
                          </label>
                          <input
                            type="date"
                            value={editingTimer.targetDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setEditingTimer({ ...editingTimer, targetDate: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white/30 dark:bg-black/30 border border-gray-200/60 dark:border-white/10 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
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
                          <HexColorPicker
                            color={editingTimer.color}
                            onChange={(color) => setEditingTimer({ ...editingTimer, color })}
                            className="w-full !w-full"
                          />
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

      {/* iOS-Style Bottom Sheet: 设置 (Settings & Functions) */}
      <AnimatePresence>
        {activeTab === 'settings' && (
          <div data-page-transition-ignore="true" className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => onTabChange('timer')}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 360 }}
              className="relative z-10 flex max-h-[92vh] flex-col rounded-t-[28px] border-t border-white/25 bg-white/90 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/90"
            >
              {/* Grab Bar */}
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-400/40 dark:bg-gray-600/60 mb-2" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/50 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white font-display">
                    {t('header.settingsAndTools', '设置与功能')}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                    v{currentVersion}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('timer')}
                  className="size-7 inline-flex items-center justify-center rounded-full bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 cursor-pointer transition-colors"
                  aria-label="关闭"
                >
                  <FiX className="size-4" />
                </button>
              </div>

              {/* Grouped Controls - Compact single-screen layout */}
              <div className="mt-2.5 flex flex-col gap-2.5 overflow-y-auto">
                {/* Section 1: 快捷开关 (2x2 Grid) */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {t('mobile.quickControls', '快捷开关')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Theme Toggle */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                        theme === 'cream'
                          ? 'border-amber-500/40 bg-amber-500/12 dark:bg-amber-500/18 shadow-xs'
                          : 'border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10'
                      } backdrop-blur-md`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`size-7.5 rounded-lg flex items-center justify-center shrink-0 ${
                            theme === 'cream'
                              ? 'bg-amber-500/25 text-amber-600 dark:text-amber-400'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {theme === 'cream' ? <FiCoffee className="size-4" /> : <FiSun className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {t('mobile.creamMode', '米白模式')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {theme === 'cream' ? '已开启' : '浅白模式'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`size-4 rounded-full flex items-center justify-center shrink-0 border ${
                          theme === 'cream'
                            ? 'bg-amber-500 border-amber-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-transparent'
                        }`}
                      >
                        {theme === 'cream' && <FiCheck className="size-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleFullscreen();
                        onTabChange('timer');
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                        isFullscreen
                          ? 'border-primary-500/40 bg-primary-500/12 dark:bg-primary-500/18 shadow-xs'
                          : 'border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10'
                      } backdrop-blur-md`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`size-7.5 rounded-lg flex items-center justify-center shrink-0 ${
                            isFullscreen
                              ? 'bg-primary-500/25 text-primary-600 dark:text-primary-400'
                              : 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/15 dark:text-indigo-400'
                          }`}
                        >
                          {isFullscreen ? <FiMinimize className="size-4" /> : <FiMaximize className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {isFullscreen ? t('header.exitFullscreen', '退出全屏') : t('header.fullscreen', '全屏显示')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {isFullscreen ? '沉浸中' : '窗口模式'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`size-4 rounded-full flex items-center justify-center shrink-0 border ${
                          isFullscreen
                            ? 'bg-primary-500 border-primary-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-transparent'
                        }`}
                      >
                        {isFullscreen && <FiCheck className="size-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Todo Floating Widget Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isWidgetEnabled;
                        setWidgetEnabled(next);
                        if (next) {
                          window.location.hash = 'todo-widget';
                          onTabChange('timer');
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all active:scale-[0.98] ${
                        isWidgetEnabled
                          ? 'border-emerald-500/40 bg-emerald-500/12 dark:bg-emerald-500/18 shadow-xs'
                          : 'border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10'
                      } backdrop-blur-md`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`size-7.5 rounded-lg flex items-center justify-center shrink-0 ${
                            isWidgetEnabled
                              ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                              : 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400'
                          }`}
                        >
                          <FiList className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {t('mobile.todoWidgetTitle', '桌面挂件')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {isWidgetEnabled ? '显示中' : '已隐藏'}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`size-4 rounded-full flex items-center justify-center shrink-0 border ${
                          isWidgetEnabled
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 bg-transparent'
                        }`}
                      >
                        {isWidgetEnabled && <FiCheck className="size-2.5 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Language Switcher Card */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7.5 rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <FiGlobe className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {t('mobile.language', '语言')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {currentLang === 'zh-CN' ? '中文' : 'English'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center p-0.5 rounded-lg bg-black/6 dark:bg-white/10 text-[10px] font-semibold shrink-0">
                        <button
                          type="button"
                          onClick={() => currentLang !== 'zh-CN' && changeLanguage('zh-CN')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            currentLang === 'zh-CN'
                              ? 'bg-primary-500 text-white shadow-xs font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          中
                        </button>
                        <button
                          type="button"
                          onClick={() => currentLang !== 'en-US' && changeLanguage('en-US')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer font-sans ${
                            currentLang === 'en-US'
                              ? 'bg-primary-500 text-white shadow-xs font-bold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          EN
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: 功能与服务 (Compact Unified List Card) */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {t('mobile.preferences', '功能与偏好')}
                  </div>
                  <div className="rounded-xl border border-white/30 bg-white/50 dark:border-white/10 dark:bg-white/5 divide-y divide-gray-200/40 dark:divide-white/5 backdrop-blur-md overflow-hidden">
                    {/* Theme Color Palette */}
                    <button
                      type="button"
                      onClick={() => setIsThemeLibraryOpen(true)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs text-white"
                          style={{ backgroundColor: accentColor || '#10A37F' }}
                        >
                          <FiPalette className="size-3.5 stroke-[2.2]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {t('theme.title', '主题配色库')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {t('theme.subtitle', '灵感源自 ChatGPT 极简美学')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 pl-2">
                        <span
                          className="size-3.5 rounded-full border border-black/10 dark:border-white/20 inline-block shadow-xs"
                          style={{ backgroundColor: accentColor || '#10A37F' }}
                        />
                        <FiChevronRight className="size-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Background Settings */}

                    <button
                      type="button"
                      onClick={() => {
                        onOpenBackground();
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400 flex items-center justify-center shrink-0">
                          <FiImage className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {t('mobile.wallpaper', '背景壁纸')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {t('mobile.wallpaperDesc', '渐变配色、壁纸与毛玻璃模糊度')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs shrink-0 pl-2">
                        <span>{t('mobile.customize', '定制')}</span>
                        <FiChevronRight className="size-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Todo Page */}
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = 'todo';
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FiCheckSquare className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {t('mobile.todoPageTitle', '待办清单')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {t('mobile.todoPageDesc', '大屏全景待办、支持拖拽与振动反馈')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs shrink-0 pl-2">
                        <span>{t('mobile.enterPage', '进入')}</span>
                        <FiChevronRight className="size-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Share & QR Code */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenShare();
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FiShare2 className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {t('share.title', '分享与二维码')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {t('share.subtitle', '网站访问二维码与计时器分享')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 text-xs shrink-0 pl-2">
                        <span>查看</span>
                        <FiChevronRight className="size-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Version & About */}
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange('timer');
                        openAboutModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400 flex items-center justify-center shrink-0">
                          <FiInfo className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {t('version.title', '版本与更新')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {hasUpdate
                              ? t('version.hasNewVersion', '发现新版本可供升级')
                              : t('version.upToDate', '当前已是最新版本')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        {hasUpdate && (
                          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                          v{currentVersion}
                        </span>
                        <FiChevronRight className="size-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Footer branding */}
                <div className="text-center pt-0.5 pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('timer');
                      openAboutModal();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  >
                    <span>TimePulse · Designed for Focus & Flow</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ChatGPT Theme Color Palette Library Modal */}
      <ThemeLibraryModal
        isOpen={isThemeLibraryOpen}
        onClose={() => setIsThemeLibraryOpen(false)}
      />
    </>
  );
}

