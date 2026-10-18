import { useState, useReducer, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult, type DraggableProvided, type DraggableStateSnapshot, type DraggableRubric } from '@hello-pangea/dnd';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiSmartphone,
  FiCheck,
  FiStar,
  FiBarChart2,
  FiMinimize2,
} from 'react-icons/fi';
import { todoReducer, isAllCompleted } from '../todoReducer';
import {
  hydrateTodoItemsFromDatabase,
  readTodoItems,
  writeTodoItems,
  readActiveTodoTab,
  writeActiveTodoTab,
  readTodoAutoSort,
  writeTodoAutoSort,
  TODO_STORAGE_EVENT,
} from '../todoStorage';
import type { TodoItem, TodoType, PriorityLevel } from '../types';
import TodoItemRow from './TodoItemRow';
import PriorityColorPicker from './PriorityColorPicker';
import {
  triggerHaptic,
  isHapticEnabled,
  setHapticEnabled,
} from '@/services/vibration';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from '@/i18n/useTranslation';

interface TodoPageProps {
  onBack?: () => void;
  onOpenAsWidget?: () => void;
  className?: string;
}

export default function TodoPage({ onBack, onOpenAsWidget, className = '' }: TodoPageProps) {
  const { accentColor } = useTheme();
  const { t, currentLang } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const tabSpringTransition = useMemo(
    () =>
      shouldReduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 450, damping: 32 },
    [shouldReduceMotion],
  );

  const [state, dispatch] = useReducer(todoReducer, {
    items: [],
    activeTab: 'todo',
    autoSort: readTodoAutoSort(),
  });

  const [inputText, setInputText] = useState('');
  const [inputColor, setInputColor] = useState<string | undefined>();
  const [inputPriority, setInputPriority] = useState<PriorityLevel | undefined>();
  const [hapticActive, setHapticActive] = useState(() => isHapticEnabled());
  const [justCompletedAll, setJustCompletedAll] = useState(false);
  const [clearingCompletedIds, setClearingCompletedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 初始化加载本地数据并监听同步事件
  useEffect(() => {
    const loadFromStorage = () => {
      const savedItems = readTodoItems();
      const savedTab = readActiveTodoTab();
      const savedAutoSort = readTodoAutoSort();
      const currentJson = JSON.stringify(stateRef.current.items);
      const savedJson = JSON.stringify(savedItems);
      if (
        currentJson !== savedJson ||
        stateRef.current.activeTab !== savedTab ||
        stateRef.current.autoSort !== savedAutoSort
      ) {
        dispatch({
          type: 'load',
          items: savedItems,
          activeTab: savedTab,
          autoSort: savedAutoSort,
        });
      }
    };
    loadFromStorage();
    void hydrateTodoItemsFromDatabase().then(loadFromStorage);

    window.addEventListener(TODO_STORAGE_EVENT, loadFromStorage);
    window.addEventListener('storage', loadFromStorage);
    return () => {
      window.removeEventListener(TODO_STORAGE_EVENT, loadFromStorage);
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  // 状态改变时自动持久化
  useEffect(() => {
    if (state.items.length > 0) {
      writeTodoItems(state.items);
    }
  }, [state.items]);

  useEffect(() => {
    writeActiveTodoTab(state.activeTab);
  }, [state.activeTab]);

  useEffect(() => {
    if (state.autoSort !== undefined) {
      writeTodoAutoSort(state.autoSort);
    }
  }, [state.autoSort]);

  // 过滤当前 tab 的项目
  const currentTabItems = useMemo(() => {
    return state.items.filter((item) => item.type === state.activeTab);
  }, [state.items, state.activeTab]);

  const completedCount = useMemo(() => {
    return currentTabItems.filter((item) => item.completed).length;
  }, [currentTabItems]);

  const totalCount = currentTabItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 统计两个 tab 的数量
  const todoCount = useMemo(() => {
    return state.items.filter((item) => item.type === 'todo').length;
  }, [state.items]);

  const checklistCount = useMemo(() => {
    return state.items.filter((item) => item.type === 'checklist').length;
  }, [state.items]);

  // 切换完成状态并触发振动
  // 说明：以下回调用 useCallback 保持稳定引用，配合 memo(TodoItemRow)，
  // 拖拽期间只有真正变化的行会重渲染。
  const handleToggle = useCallback(async (id: string) => {
    const targetItem = state.items.find((item) => item.id === id);
    if (!targetItem) return;

    const willBeCompleted = !targetItem.completed;
    dispatch({ type: 'toggle', id });

    if (willBeCompleted) {
      const nextItems = state.items.map((item) =>
        item.id === id ? { ...item, completed: true } : item,
      );
      const isNowAllDone = isAllCompleted(nextItems, state.activeTab);

      if (isNowAllDone) {
        setJustCompletedAll(true);
        setTimeout(() => setJustCompletedAll(false), 3500);
        await triggerHaptic('all_complete');
      } else {
        await triggerHaptic('item_complete');
      }
    }
  }, [state.items, state.activeTab]);

  const handleDeleteItem = useCallback((id: string) => {
    dispatch({ type: 'delete', id });
  }, []);

  const handleEditItem = useCallback((id: string, text: string) => {
    dispatch({ type: 'edit', id, text });
  }, []);

  const handleSetItemPriority = useCallback((id: string, color?: string, priority?: PriorityLevel) => {
    dispatch({ type: 'set_priority', id, color, priority });
  }, []);

  const renderTodoClone = useCallback(
    (dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot, rubric: DraggableRubric) => {
      const item = currentTabItems[rubric.source.index];
      if (!item) return null;
      return (
        <TodoItemRow
          item={item}
          index={rubric.source.index}
          provided={dragProvided}
          snapshot={dragSnapshot}
          accentColor={accentColor}
          isDeleting={clearingCompletedIds.has(item.id)}
          onToggle={handleToggle}
          onDelete={handleDeleteItem}
          onEdit={handleEditItem}
          onSetPriority={handleSetItemPriority}
        />
      );
    },
    [currentTabItems, accentColor, clearingCompletedIds, handleToggle, handleDeleteItem, handleEditItem, handleSetItemPriority],
  );

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    dispatch({
      type: 'add',
      text: trimmed,
      itemType: state.activeTab,
      color: inputColor,
      priority: inputPriority,
    });
    setInputText('');
    setInputColor(undefined);
    setInputPriority(undefined);
    inputRef.current?.focus();
  };

  // 拖拽完成排序处理
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const newOrderItems = Array.from(currentTabItems);
    const [moved] = newOrderItems.splice(result.source.index, 1);
    newOrderItems.splice(result.destination.index, 0, moved);

    dispatch({ type: 'reorder', items: newOrderItems });
    await triggerHaptic('reorder');
  };

  const handleToggleHaptic = async () => {
    const nextState = !hapticActive;
    setHapticActive(nextState);
    setHapticEnabled(nextState);
    if (nextState) {
      await triggerHaptic('test');
    }
  };

  const handleToggleAutoSort = async () => {
    const nextState = !state.autoSort;
    dispatch({ type: 'set_auto_sort', enabled: nextState });
    writeTodoAutoSort(nextState);
    await triggerHaptic('selection');
  };

  const handleTestVibrate = async () => {
    await triggerHaptic('test');
  };

  const handleClearCompleted = () => {
    const completedItems = currentTabItems.filter((i) => i.completed);
    if (completedItems.length === 0) return;
    if (shouldReduceMotion) {
      dispatch({ type: 'clear_completed', itemType: state.activeTab });
      return;
    }
    const ids = new Set(completedItems.map((i) => i.id));
    setClearingCompletedIds(ids);
    setTimeout(() => {
      dispatch({ type: 'clear_completed', itemType: state.activeTab });
      setClearingCompletedIds(new Set());
    }, 350);
  };

  // 一键载入专注预设清单（附带优先级颜色标记）
  const handleLoadFocusPresets = () => {
    const presets =
      state.activeTab === 'checklist'
        ? [
            {
              text: t('todo.presetChecklist1', '倒好温水并放好水杯'),
              type: 'checklist' as TodoType,
              color: '#10B981',
              priority: 'low' as PriorityLevel,
            },
            {
              text: t('todo.presetChecklist2', '手机开启勿扰 / 静音模式'),
              type: 'checklist' as TodoType,
              color: '#EF4444',
              priority: 'urgent' as PriorityLevel,
            },
            {
              text: t('todo.presetChecklist3', '关闭无关浏览器标签页与聊天软件'),
              type: 'checklist' as TodoType,
              color: '#F97316',
              priority: 'high' as PriorityLevel,
            },
            {
              text: t('todo.presetChecklist4', '写下本轮番茄钟核心交付物'),
              type: 'checklist' as TodoType,
              color: '#F59E0B',
              priority: 'medium' as PriorityLevel,
            },
          ]
        : [
            {
              text: t('todo.presetTodo1', '梳理今天最重要的 3 件事'),
              type: 'todo' as TodoType,
              color: '#EF4444',
              priority: 'urgent' as PriorityLevel,
            },
            {
              text: t('todo.presetTodo2', '保持专注，完成第一阶段核心目标'),
              type: 'todo' as TodoType,
              color: '#F97316',
              priority: 'high' as PriorityLevel,
            },
            {
              text: t('todo.presetTodo3', '整理工作笔记与复盘今日进展'),
              type: 'todo' as TodoType,
              color: '#10B981',
              priority: 'low' as PriorityLevel,
            },
          ];
    dispatch({ type: 'batch_add', items: presets });
  };

  return (
    <div
      data-page-view="todo"
      className={`todo-page-container relative flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 select-none ${className}`}
      style={{
        paddingTop: 'var(--todo-pt, max(4.5rem, calc(3.75rem + env(safe-area-inset-top, 0px))))',
        paddingBottom: 'var(--todo-pb, max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px))))',
        paddingLeft: 'max(1rem, var(--tp-safe-left, env(safe-area-inset-left, 0px)))',
        paddingRight: 'max(1rem, var(--tp-safe-right, env(safe-area-inset-right, 0px)))',
      }}
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-3.5 sm:gap-4 md:gap-5">
        {/* 顶部操作条：返回主页 + 标题 + 振动控制 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/20 bg-white/40 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-800 shadow-sm backdrop-blur-md transition-all hover:bg-white/70 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 cursor-pointer"
              aria-label={t('todo.returnToTimer', '返回计时器')}
            >
              <FiArrowLeft className="size-3.5 sm:size-4 transition-transform group-hover:-translate-x-0.5" />
              <span>{t('todo.returnToTimer', '返回计时器')}</span>
            </button>

            {onOpenAsWidget && (
              <button
                type="button"
                onClick={onOpenAsWidget}
                className="hidden lg:inline-flex group items-center gap-1.5 rounded-full border border-white/20 bg-white/30 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"
                title={t('todo.widgetModeAria', '切回桌面小窗挂件模式')}
                aria-label={t('todo.widgetModeAria', '切回桌面小窗挂件模式')}
              >
                <FiMinimize2 className="size-3.5" />
                <span>{t('todo.widgetMode', '小窗模式')}</span>
              </button>
            )}
          </div>

          {/* 右侧工具组 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleHaptic}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                hapticActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'border-white/20 bg-white/30 text-gray-500 hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400'
              } backdrop-blur-md`}
              title={
                hapticActive
                  ? t('todo.hapticOnTip', '手机触觉反馈已开启（点击关闭）')
                  : t('todo.hapticOffTip', '手机触觉反馈已关闭（点击开启）')
              }
            >
              <FiSmartphone className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {hapticActive
                  ? t('todo.hapticEnabled', '触觉反馈已开启')
                  : t('todo.hapticDisabled', '触觉反馈已关闭')}
              </span>
              <span className="sm:hidden">{hapticActive ? '触觉开启' : '触觉关闭'}</span>
            </button>
          </div>
        </div>

        {/* 页面主标题卡片 */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-black/[0.06] bg-white/80 p-3.5 sm:p-5 md:p-6 shadow-md sm:shadow-xl backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#141416]/90">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-6.5 sm:size-8 items-center justify-center rounded-lg sm:rounded-xl text-white shadow-sm bg-sky-500">
                  <FiCheck className="size-3.5 sm:size-4.5 stroke-[2.8]" />
                </div>
                <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {t('todo.title', '待办与核对清单')}
                </h1>
              </div>
              <p className="hidden sm:block mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {t('todo.subtitle', '专注当下，逐项击破 · 让每一次专注高效且清晰')}
              </p>
            </div>

            {/* 顶部分类切换 Tabs */}
            <div className="relative flex w-full md:w-auto items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl bg-black/5 p-1 sm:p-1.5 dark:bg-white/10">
              <button
                type="button"
                aria-label={t('todo.switchToTodo', '切换到待办事项')}
                onClick={() => dispatch({ type: 'set_tab', tab: 'todo' })}
                className={`relative flex flex-1 md:flex-initial items-center justify-center rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer select-none ${
                  state.activeTab === 'todo'
                    ? 'text-gray-950 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {state.activeTab === 'todo' && (
                  <motion.div
                    layoutId="todo-page-active-tab-pill"
                    transition={tabSpringTransition}
                    className="absolute inset-0 rounded-lg sm:rounded-xl bg-white shadow-xs sm:shadow-sm dark:bg-neutral-800"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                  <FiList className="size-3.5 sm:size-4" />
                  <span>{t('todo.tabTodo', '待办事项')}</span>
                  <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-bold dark:bg-white/10">
                    {todoCount}
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-label={t('todo.switchToChecklist', '切换到核对清单')}
                onClick={() => dispatch({ type: 'set_tab', tab: 'checklist' })}
                className={`relative flex flex-1 md:flex-initial items-center justify-center rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer select-none ${
                  state.activeTab === 'checklist'
                    ? 'text-gray-950 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {state.activeTab === 'checklist' && (
                  <motion.div
                    layoutId="todo-page-active-tab-pill"
                    transition={tabSpringTransition}
                    className="absolute inset-0 rounded-lg sm:rounded-xl bg-white shadow-xs sm:shadow-sm dark:bg-neutral-800"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                  <FiCheckCircle className="size-3.5 sm:size-4" />
                  <span>{t('todo.tabChecklist', '核对清单')}</span>
                  <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-bold dark:bg-white/10">
                    {checklistCount}
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* 进度光条与统计数据 */}
          <div className="mt-2.5 sm:mt-5 border-t border-gray-200/40 pt-2 sm:pt-4 dark:border-white/10">
            <div className="flex items-center justify-between text-xs md:text-sm text-gray-600 dark:text-gray-300 pb-1 sm:pb-1.5">
              <span className="font-medium">
                <span className="sm:hidden">
                  {state.activeTab === 'todo'
                    ? t('todo.todoProgressShort', '待办进度')
                    : t('todo.checklistProgressShort', '核对进度')}
                </span>
                <span className="hidden sm:inline">
                  {state.activeTab === 'todo'
                    ? t('todo.todoProgress', '待办事项完成度')
                    : t('todo.checklistProgress', '专注流程核对进度')}
                </span>
              </span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                <span className="sm:hidden">
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
                <span className="hidden sm:inline">
                  {completedCount} / {totalCount} {t('todo.progressSummary', '项完成')} (
                  {progressPercent}%)
                </span>
              </span>
            </div>

            <div className="relative h-1.5 sm:h-2.5 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
              <motion.div
                className="h-full rounded-full bg-sky-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>

            {/* 全胜庆祝横幅 */}
            <AnimatePresence>
              {justCompletedAll && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  className="mt-2.5 sm:mt-3 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-emerald-500/15 py-1.5 sm:py-2 px-3 sm:px-4 text-xs md:text-sm font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  <FiCheckCircle className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
                  <span>
                    {t(
                      'todo.allDone',
                      '太棒了！全部清单项已顺利完成，已触发触觉反馈',
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 快速添加任务输入栏（支持预选优先级颜色） */}
        <form onSubmit={handleAddItem} className="w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-black/[0.06] bg-white/80 p-1.5 pl-2.5 sm:p-2 sm:pl-3 shadow-sm backdrop-blur-xl transition-all focus-within:border-black/20 focus-within:ring-2 focus-within:ring-black/5 dark:border-white/[0.08] dark:bg-[#141416]/90 dark:focus-within:border-white/20 dark:focus-within:ring-white/5">
            <PriorityColorPicker
              color={inputColor}
              priority={inputPriority}
              onSelect={(c, p) => {
                setInputColor(c);
                setInputPriority(p);
              }}
              showText={true}
              size="sm"
              align="left"
              title={t('todo.chooseAddPriority', '为新任务预设优先级颜色')}
            />

            <input
              ref={inputRef}
              type="text"
              placeholder={
                state.activeTab === 'todo'
                  ? t('todo.placeholderTodo', '添加新的待办事项，按回车添加...')
                  : t('todo.placeholderChecklist', '添加专注流程检查项，按回车添加...')
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm md:text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex h-8 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-3 sm:px-4 font-semibold text-xs md:text-sm text-white shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0 bg-sky-500 hover:bg-sky-600 active:bg-sky-700"
              aria-label={t('todo.add', '添加')}
            >
              <FiPlus className="size-3.5 sm:size-4 stroke-[2.5]" />
              <span>{t('todo.add', '添加')}</span>
            </button>
          </div>
        </form>

        {/* 任务列表主体 */}
        <div className="flex flex-col gap-2 rounded-2xl md:rounded-3xl border border-black/[0.06] bg-white/80 p-3 sm:p-4 md:p-5 shadow-xl backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#141416]/90 min-h-[220px] sm:min-h-[280px] overflow-x-hidden">
          <motion.div
            key={state.activeTab}
            initial={shouldReduceMotion ? false : { opacity: 0.45, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col flex-1"
          >
            {currentTabItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 sm:py-12 text-center text-gray-400 dark:text-gray-500">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 mb-2.5 sm:mb-3">
                <FiList className="size-6 sm:size-7 stroke-[1.5] opacity-60" />
              </div>
              <p className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
                {state.activeTab === 'todo'
                  ? t('todo.emptyTodo', '当前暂无待办事项')
                  : t('todo.emptyChecklist', '当前暂无核对清单')}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('todo.emptyDesc', '立即在上方输入框添加任务与清单')}
              </p>
              <button
                type="button"
                onClick={handleLoadFocusPresets}
                className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs md:text-sm font-semibold text-primary-600 hover:bg-primary-500/20 dark:border-primary-400/30 dark:bg-primary-500/15 dark:text-primary-300 transition-all cursor-pointer"
              >
                <FiStar className="size-3.5 sm:size-4" />
                <span>{t('todo.loadPresets', '载入专注推荐清单预设')}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1 pb-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span>{t('todo.dragTip', '提示：按住左侧手柄可上下拖拽自由排序')}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'sort_by_priority' })}
                    className="inline-flex items-center gap-1 rounded-full border border-primary-500/20 bg-primary-500/10 px-2 py-0.5 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-all cursor-pointer"
                    title={t('todo.sortByPriorityTip', '根据设置的优先级颜色自动由高到低排列')}
                  >
                    <FiBarChart2 className="size-3" />
                    <span>{t('todo.sortByPriority', '按优先级排序')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAutoSort}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
                      state.autoSort
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-2xs'
                        : 'border-black/10 bg-black/5 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 hover:bg-black/10'
                    }`}
                    title={
                      state.autoSort
                        ? t('todo.autoSortOnTip', '自动排序已开启：添加任务或修改优先级时将自动按优先级排序（点击关闭）')
                        : t('todo.autoSortOffTip', '自动排序已关闭：可自由上下拖拽排序（点击开启自动排序）')
                    }
                  >
                    <span className={`size-1.5 rounded-full ${state.autoSort ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span>{state.autoSort ? t('todo.autoSortOn', '自动排序：开') : t('todo.autoSortOff', '自动排序：关')}</span>
                  </button>
                </div>
                <span>{t('todo.editTip', '双击文本可快速修改')}</span>
              </div>

              {/* 使用 @hello-pangea/dnd 实现流畅的拖拽排序 */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable
                  droppableId="todo-page-list"
                  renderClone={renderTodoClone}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-2 rounded-2xl transition-colors duration-200 ${
                        snapshot.isDraggingOver
                          ? 'bg-primary-500/[0.02] dark:bg-primary-500/[0.04]'
                          : ''
                      }`}
                    >
                      {currentTabItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <TodoItemRow
                              item={item}
                              index={index}
                              provided={dragProvided}
                              snapshot={dragSnapshot}
                              accentColor={accentColor}
                              isDeleting={clearingCompletedIds.has(item.id)}
                              onToggle={handleToggle}
                              onDelete={handleDeleteItem}
                              onEdit={handleEditItem}
                              onSetPriority={handleSetItemPriority}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
          </motion.div>

          {/* 底部功能工具栏 */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-t border-gray-200/50 pt-2.5 sm:pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {state.activeTab === 'checklist' ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'reset_all', itemType: 'checklist' })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 hover:bg-black/5 hover:text-primary-600 dark:hover:bg-white/10 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  title={t('todo.resetAllTip', '重置所有勾选，开启新一轮核对')}
                >
                  <FiRotateCcw className="size-3.5" />
                  <span>{t('todo.resetAll', '重置所有勾选')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                  title={t('todo.clearCompletedTip', '清理所有已完成的项目')}
                >
                  <FiTrash2 className="size-3.5" />
                  <span>{t('todo.clearCompleted', '清除已完成项目')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLoadFocusPresets}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FiStar className="size-3.5" />
                <span>{t('todo.importPresets', '导入预设')}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestVibrate}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-black/5 hover:text-primary-600 dark:hover:bg-white/10 dark:hover:text-primary-400 transition-colors cursor-pointer"
                title={t('todo.testVibrateTip', '调用系统振动 API 测试')}
              >
                <FiSmartphone className="size-3.5" />
                <span>{t('todo.testVibrate', '测试振动')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
