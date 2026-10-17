import { useState, useReducer, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiSmartphone,
  FiZap,
  FiStar,
  FiCheck,
} from 'react-icons/fi';
import { todoReducer, isAllCompleted } from '../todoReducer';
import {
  readTodoItems,
  writeTodoItems,
  readActiveTodoTab,
  writeActiveTodoTab,
  TODO_STORAGE_EVENT,
} from '../todoStorage';
import type { TodoItem, TodoType } from '../types';
import TodoItemRow from './TodoItemRow';
import {
  triggerHaptic,
  isHapticEnabled,
  setHapticEnabled,
} from '@/services/vibration';
import { useTheme } from '@/app/providers/ThemeProvider';
import { FiMinimize2 } from 'react-icons/fi';

interface TodoPageProps {
  onBack?: () => void;
  onOpenAsWidget?: () => void;
  className?: string;
}

export default function TodoPage({ onBack, onOpenAsWidget, className = '' }: TodoPageProps) {
  const { accentColor } = useTheme();

  const [state, dispatch] = useReducer(todoReducer, {
    items: [],
    activeTab: 'todo',
  });

  const [inputText, setInputText] = useState('');
  const [hapticActive, setHapticActive] = useState(() => isHapticEnabled());
  const [justCompletedAll, setJustCompletedAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 初始化加载本地数据并监听同步事件
  useEffect(() => {
    const loadFromStorage = () => {
      const savedItems = readTodoItems();
      const savedTab = readActiveTodoTab();
      const currentJson = JSON.stringify(stateRef.current.items);
      const savedJson = JSON.stringify(savedItems);
      if (currentJson !== savedJson || stateRef.current.activeTab !== savedTab) {
        dispatch({ type: 'load', items: savedItems, activeTab: savedTab });
      }
    };
    loadFromStorage();

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
  const handleToggle = async (id: string) => {
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
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    dispatch({ type: 'add', text: trimmed, itemType: state.activeTab });
    setInputText('');
    inputRef.current?.focus();
  };

  const handleReorder = (newOrderItems: TodoItem[]) => {
    dispatch({ type: 'reorder', items: newOrderItems });
  };

  const handleDragEnd = async () => {
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

  const handleTestVibrate = async () => {
    await triggerHaptic('test');
  };

  // 一键载入专注预设清单
  const handleLoadFocusPresets = () => {
    const presets =
      state.activeTab === 'checklist'
        ? [
            { text: '倒好温水并放好水杯', type: 'checklist' as TodoType },
            { text: '手机开启勿扰 / 静音模式', type: 'checklist' as TodoType },
            { text: '关闭无关浏览器标签页与聊天软件', type: 'checklist' as TodoType },
            { text: '写下本轮番茄钟核心交付物', type: 'checklist' as TodoType },
          ]
        : [
            { text: '梳理今天最重要的 3 件事', type: 'todo' as TodoType },
            { text: '保持专注，完成第一阶段核心目标', type: 'todo' as TodoType },
            { text: '整理工作笔记与复盘今日进展', type: 'todo' as TodoType },
          ];
    dispatch({ type: 'batch_add', items: presets });
  };

  return (
    <div
      data-page-view="todo"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pt-16 pb-28 md:pt-20 md:pb-12 ${className}`}
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">
        {/* 顶部操作条：返回主页 + 标题 + 振动控制 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/40 px-3.5 py-1.5 text-xs md:text-sm font-medium text-gray-800 shadow-sm backdrop-blur-md transition-all hover:bg-white/70 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 cursor-pointer"
              aria-label="返回计时器"
            >
              <FiArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              <span>返回计时器</span>
            </button>

            {onOpenAsWidget && (
              <button
                type="button"
                onClick={onOpenAsWidget}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/30 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 cursor-pointer"
                title="切回桌面小窗挂件模式"
                aria-label="切回桌面小窗挂件模式"
              >
                <FiMinimize2 className="size-3.5" />
                <span>小窗模式</span>
              </button>
            )}
          </div>

          {/* 右侧工具组 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleHaptic}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                hapticActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'border-white/20 bg-white/30 text-gray-500 hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400'
              } backdrop-blur-md`}
              title={hapticActive ? '手机振动反馈已开启（点击关闭）' : '手机振动反馈已关闭（点击开启）'}
            >
              <FiSmartphone className="size-3.5" />
              <span>{hapticActive ? '振动已开启' : '振动已关闭'}</span>
            </button>
          </div>
        </div>

        {/* 页面主标题卡片 */}
        <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-white/60 p-5 md:p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: accentColor || '#0ea5e9' }}
                >
                  <FiCheck className="size-4.5 stroke-[2.8]" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  待办与核对清单
                </h1>
              </div>
              <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                专注当下，逐项击破 · 让每一次专注高效且清晰
              </p>
            </div>

            {/* 顶部分类切换 Tabs */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-black/5 p-1.5 dark:bg-white/10">
              <button
                type="button"
                aria-label="切换到待办事项"
                onClick={() => dispatch({ type: 'set_tab', tab: 'todo' })}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  state.activeTab === 'todo'
                    ? 'bg-white text-gray-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FiList className="size-4" />
                <span>待办事项</span>
                <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-bold dark:bg-white/10">
                  {todoCount}
                </span>
              </button>

              <button
                type="button"
                aria-label="切换到核对清单"
                onClick={() => dispatch({ type: 'set_tab', tab: 'checklist' })}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  state.activeTab === 'checklist'
                    ? 'bg-white text-gray-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <FiCheckCircle className="size-4" />
                <span>核对清单</span>
                <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-bold dark:bg-white/10">
                  {checklistCount}
                </span>
              </button>
            </div>
          </div>

          {/* 进度光条与统计数据 */}
          <div className="mt-5 border-t border-gray-200/50 pt-4 dark:border-white/10">
            <div className="flex items-center justify-between text-xs md:text-sm text-gray-600 dark:text-gray-300 pb-1.5">
              <span className="font-medium">
                {state.activeTab === 'todo' ? '待办事项完成度' : '专注流程核对进度'}
              </span>
              <span className="font-semibold" style={{ color: accentColor || '#0ea5e9' }}>
                {completedCount} / {totalCount} 项完成 ({progressPercent}%)
              </span>
            </div>

            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: accentColor || '#0ea5e9' }}
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
                  className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 py-2 px-4 text-xs md:text-sm font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  <FiCheckCircle className="size-4 text-emerald-500" />
                  <span>太棒了！全部清单项已顺利完成，已触发触觉反馈</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 快速添加任务输入栏 */}
        <form onSubmit={handleAddItem} className="w-full">
          <div className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/70 p-2 pl-4 shadow-lg backdrop-blur-xl transition-all focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 dark:border-white/10 dark:bg-neutral-900/80">
            <input
              ref={inputRef}
              type="text"
              placeholder={
                state.activeTab === 'todo'
                  ? '添加新的待办事项，按回车添加...'
                  : '添加专注流程检查项，按回车添加...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-transparent text-sm md:text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 font-semibold text-xs md:text-sm text-white shadow-sm disabled:opacity-40 transition-all cursor-pointer shrink-0"
              style={{ backgroundColor: accentColor || '#0ea5e9' }}
              aria-label="添加"
            >
              <FiPlus className="size-4 stroke-[2.5]" />
              <span>添加</span>
            </button>
          </div>
        </form>

        {/* 任务列表主体 */}
        <div className="flex flex-col gap-2 rounded-3xl border border-white/30 bg-white/60 p-4 md:p-5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/70 min-h-[280px]">
          {currentTabItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 mb-3">
                <FiList className="size-7 stroke-[1.5] opacity-60" />
              </div>
              <p className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
                当前暂无{state.activeTab === 'todo' ? '待办事项' : '核对清单'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                立即在上方输入添加，或一键导入专属专注清单
              </p>
              <button
                type="button"
                onClick={handleLoadFocusPresets}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-xs md:text-sm font-semibold text-primary-600 hover:bg-primary-500/20 dark:border-primary-400/30 dark:bg-primary-500/15 dark:text-primary-300 transition-all cursor-pointer"
              >
                <FiStar className="size-4" />
                <span>载入专注推荐清单预设</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 pb-1 text-xs text-gray-500 dark:text-gray-400">
                <span>提示：按住左侧手柄可上下拖拽自由排序</span>
                <span>双击文本可快速修改</span>
              </div>
              <Reorder.Group
                as="div"
                axis="y"
                values={currentTabItems}
                onReorder={handleReorder}
                className="flex flex-col gap-2"
              >
                {currentTabItems.map((item) => (
                  <TodoItemRow
                    key={item.id}
                    item={item}
                    accentColor={accentColor}
                    onToggle={handleToggle}
                    onDelete={(id) => dispatch({ type: 'delete', id })}
                    onEdit={(id, text) => dispatch({ type: 'edit', id, text })}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </Reorder.Group>
            </div>
          )}

          {/* 底部功能工具栏 */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/50 pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
            <div className="flex items-center gap-2">
              {state.activeTab === 'checklist' ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'reset_all', itemType: 'checklist' })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-black/5 hover:text-primary-600 dark:hover:bg-white/10 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  title="重置所有勾选，开启新一轮核对"
                >
                  <FiRotateCcw className="size-3.5" />
                  <span>重置所有勾选</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'clear_completed', itemType: 'todo' })}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                  title="清理所有已完成的项目"
                >
                  <FiTrash2 className="size-3.5" />
                  <span>清除已完成项目</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLoadFocusPresets}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FiStar className="size-3.5" />
                <span>导入预设</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestVibrate}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-black/5 hover:text-primary-600 dark:hover:bg-white/10 dark:hover:text-primary-400 transition-colors cursor-pointer"
                title="调用系统振动 API 测试"
              >
                <FiSmartphone className="size-3.5" />
                <span>测试振动</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
