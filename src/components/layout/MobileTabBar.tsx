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
} from 'react-icons/fi';
import type { Timer, TimerType } from '@/domain/timer';
import { useTranslation } from '@/i18n/useTranslation';
import type { Language } from '@/i18n/types';
import { HexColorPicker } from 'react-colorful';
import { PRESET_COLORS } from '@/constants/colors';

export type MobileTab = 'timer' | 'list' | 'background' | 'settings';

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
          ? 'border-primary-500/50 bg-primary-500/10 dark:bg-primary-500/15 shadow-sm'
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
        <span aria-hidden="true" className="grid grid-cols-2 gap-[3px]">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="size-[3px] rounded-full bg-current" />
          ))}
        </span>
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
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/15 px-2 py-0.5 rounded-full">
              <FiCheck className="size-3" />
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
  const [timerOrder, setTimerOrder] = useState(() => timers.map((t) => t.id));
  const timerOrderRef = useRef(timerOrder);

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

  // Liquid capsule animation physics
  const liquidSpring = {
    type: 'spring' as const,
    stiffness: 420,
    damping: 30,
    mass: 0.8,
  };

  const tabsConfig = [
    { id: 'timer' as MobileTab, label: t('header.timers', '计时'), icon: FiClock },
    { id: 'list' as MobileTab, label: t('header.manage', '列表'), icon: FiList, badge: timers.length },
    { id: 'add' as const, label: '新建', icon: FiPlus, isAction: true },
    { id: 'background' as MobileTab, label: '背景', icon: FiImage },
    { id: 'settings' as MobileTab, label: t('header.settings', '设置'), icon: FiSettings },
  ];

  const getTabIndex = (tabId: string) => tabsConfig.findIndex((t) => t.id === tabId);
  const currentIndex = getTabIndex(activeTab);
  const prevIndex = getTabIndex(prevTab);
  const direction = currentIndex >= prevIndex ? 1 : -1;
  const distance = Math.abs(currentIndex - prevIndex);

  const timersById = new Map(timers.map((t) => [t.id, t]));
  const orderedTimerIds = [
    ...timerOrder.filter((id) => timersById.has(id)),
    ...timers.map((t) => t.id).filter((id) => !timerOrder.includes(id)),
  ];

  return (
    <>
      {/* SVG Liquid Filter for authentic droplet cohesion */}
      <svg className="fixed pointer-events-none opacity-0 w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="ios-liquid-droplet-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Floating Bottom TabBar Container */}
      <motion.nav
        data-page-transition-ignore="true"
        aria-label="移动端底部导航"
        initial={false}
        animate={{
          y: isVisible ? 0 : 96,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 inset-x-3 z-40 md:hidden max-w-[420px] mx-auto pointer-events-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="relative mx-auto flex h-[62px] w-full items-center justify-around rounded-full border border-white/30 bg-white/75 p-1.5 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-2xl dark:border-white/12 dark:bg-black/65 dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_2px_10px_rgba(0,0,0,0.5)]">
          {tabsConfig.map((item) => {
            if (item.isAction) {
              // Center Action: "+" Button with vibrant liquid bubble styling
              const isAddClicked = clickedTab === 'add';
              return (
                <div key={item.id} className="relative flex flex-1 items-center justify-center px-1">
                  <motion.button
                    type="button"
                    onClick={handleAddClick}
                    whileTap={{ scale: 0.88 }}
                    className="relative flex size-11 items-center justify-center rounded-full text-white shadow-md shadow-primary-500/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    style={{
                      backgroundColor: accentColor || '#0ea5e9',
                      background: `linear-gradient(135deg, ${accentColor || '#0ea5e9'}, color-mix(in srgb, ${accentColor || '#0ea5e9'} 80%, #000))`,
                    }}
                    aria-label="新建计时器"
                  >
                    {/* Inner highlight */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/35 pointer-events-none" />

                    {/* Droplet burst on click */}
                    {isAddClicked && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-white/60 pointer-events-none"
                        initial={{ scale: 0.8, opacity: 0.9 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      />
                    )}

                    <FiPlus className="size-5 stroke-[2.5]" />
                  </motion.button>
                </div>
              );
            }

            const tab = item.id as MobileTab;
            const isActive = activeTab === tab;
            const isTabClicked = clickedTab === tab;
            const Icon = item.icon;

            return (
              <div key={tab} className="relative flex flex-1 h-full items-center justify-center px-0.5">
                <button
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  while-tap={{ scale: 0.92 }}
                  className="relative flex flex-col items-center justify-center w-full h-full rounded-full cursor-pointer focus:outline-none transition-colors duration-200 select-none"
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Liquid Water Droplet Capsule Indicator */}
                  {isActive && (
                    <>
                      {/* Ambient Liquid Glow */}
                      <motion.div
                        layoutId="mobile-liquid-glow"
                        className="absolute inset-1 rounded-full opacity-40 blur-md pointer-events-none"
                        style={{ backgroundColor: accentColor || '#0ea5e9' }}
                        transition={liquidSpring}
                      />

                      {/* Liquid Droplet Capsule Body with Stretch */}
                      <motion.div
                        layoutId="mobile-liquid-capsule"
                        className="absolute inset-1 rounded-full pointer-events-none overflow-hidden"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${accentColor || '#0ea5e9'} 22%, ${
                            theme === 'cream' ? 'rgba(180,120,60,0.12)' : 'rgba(0,0,0,0.06)'
                          })`,
                          boxShadow: `0 2px 10px color-mix(in srgb, ${accentColor || '#0ea5e9'} 35%, transparent), inset 0 1px 1px rgba(255,255,255,0.45)`,
                        }}
                        initial={false}
                        animate={{
                          scaleX: [1, 1 + Math.min(distance * 0.16, 0.35), 0.96, 1],
                        }}
                        style-origin={{
                          transformOrigin: direction === 1 ? '0% 50%' : '100% 50%',
                        }}
                        transition={liquidSpring}
                      >
                        {/* Specular Liquid Droplet Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-full" />
                      </motion.div>
                    </>
                  )}

                  {/* Water Droplet Burst Ripple on Click */}
                  {isTabClicked && (
                    <motion.span
                      className="absolute inset-1 rounded-full pointer-events-none border"
                      style={{ borderColor: accentColor || '#0ea5e9' }}
                      initial={{ scale: 0.6, opacity: 0.8 }}
                      animate={{ scale: 1.45, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  )}

                  {/* Content: Icon + Label with Spring Pop */}
                  <motion.div
                    className="relative z-10 flex flex-col items-center justify-center gap-0.5"
                    animate={isActive ? { scale: [0.94, 1.14, 1], y: [0, -1.5, 0] } : { scale: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="relative">
                      <Icon
                        className={`size-[19px] transition-colors duration-200 ${
                          isActive
                            ? 'text-gray-950 dark:text-white stroke-[2.3]'
                            : 'text-gray-500 dark:text-gray-400 stroke-[1.8]'
                        }`}
                        style={isActive ? { color: accentColor || undefined } : undefined}
                      />
                      {/* Badge if present */}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 flex size-3.5 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium tracking-tight transition-colors duration-200 ${
                        isActive
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      style={isActive ? { color: accentColor || undefined } : undefined}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </button>
              </div>
            );
          })}
        </div>
      </motion.nav>

      {/* iOS-Style Bottom Sheet: 📋 列表 (Timers List & Management) */}
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
              className="relative z-10 flex max-h-[82vh] flex-col rounded-t-[28px] border-t border-white/20 bg-white/80 p-5 pb-24 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85"
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

      {/* iOS-Style Bottom Sheet: ⚙️ 设置 (Settings & Functions) */}
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
              className="relative z-10 flex max-h-[82vh] flex-col rounded-t-[28px] border-t border-white/20 bg-white/80 p-5 pb-24 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85"
            >
              {/* Grab Bar */}
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-400/40 dark:bg-gray-600/60 mb-3" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-white/10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                  设置与功能
                </h3>
                <button
                  type="button"
                  onClick={() => onTabChange('timer')}
                  className="size-8 inline-flex items-center justify-center rounded-full bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300/60 cursor-pointer transition-colors"
                >
                  <FiX className="size-4" />
                </button>
              </div>

              {/* Grouped Controls */}
              <div className="mt-4 flex flex-col gap-4 overflow-y-auto">
                {/* Section: 外观与显示 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                    外观与显示
                  </h4>
                  <div className="rounded-2xl border border-white/20 bg-white/40 dark:border-white/10 dark:bg-white/5 divide-y divide-gray-200/40 dark:divide-white/5 backdrop-blur-md overflow-hidden">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          {theme === 'cream' ? <FiCoffee className="size-5" /> : <FiSun className="size-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">米白色模式</p>
                          <p className="text-xs text-gray-500">
                            {theme === 'cream' ? '已开启温润米白模式' : '当前为浅白模式'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                          theme === 'cream' ? 'bg-amber-600/80' : 'bg-gray-300'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`inline-block size-5.5 rounded-full bg-white shadow-md ${
                            theme === 'cream' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Fullscreen Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleFullscreen();
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/30 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/15 dark:text-indigo-400 flex items-center justify-center">
                          {isFullscreen ? <FiMinimize className="size-5" /> : <FiMaximize className="size-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {isFullscreen ? '退出全屏' : '进入全屏'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">纯净沉浸式体验</p>
                        </div>
                      </div>
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                        {isFullscreen ? '已全屏' : '切换'}
                      </span>
                    </button>

                    {/* Background Settings trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBackground();
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/30 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-400/15 dark:text-purple-400 flex items-center justify-center">
                          <FiImage className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">背景壁纸</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">渐变、壁纸与毛玻璃模糊度</p>
                        </div>
                      </div>
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">定制</span>
                    </button>
                  </div>
                </div>

                {/* Section: 偏好与分享 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                    偏好与分享
                  </h4>
                  <div className="rounded-2xl border border-white/20 bg-white/40 dark:border-white/10 dark:bg-white/5 divide-y divide-gray-200/40 dark:divide-white/5 backdrop-blur-md overflow-hidden">
                    {/* Language Switch */}
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-teal-500/10 text-teal-500 dark:bg-teal-400/15 dark:text-teal-400 flex items-center justify-center">
                          <FiGlobe className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">语言 / Language</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentLang === 'zh-CN' ? '简体中文' : 'English (US)'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => changeLanguage(currentLang === 'zh-CN' ? 'en-US' : 'zh-CN')}
                        className="px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/10 bg-white/20 dark:bg-black/20 text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-white/40"
                      >
                        {currentLang === 'zh-CN' ? 'EN' : '中文'}
                      </button>
                    </div>

                    {/* Share Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenShare();
                        onTabChange('timer');
                      }}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/30 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-400/15 dark:text-blue-400 flex items-center justify-center">
                          <FiShare2 className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">分享计时器</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">生成分享链接或二维码</p>
                        </div>
                      </div>
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">生成</span>
                    </button>
                  </div>
                </div>

                {/* About TimePulse Note */}
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-display">
                    TimePulse v0.7.0 · Designed for Focus & Flow
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
