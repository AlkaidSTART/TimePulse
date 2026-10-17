import { useState, useReducer, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  FiCheckCircle,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
  FiX,
  FiMinimize2,
  FiMaximize2,
  FiSmartphone,
  FiZap,
  FiEyeOff,
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

interface TodoListWidgetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenAsPage?: () => void;
  onHideWidget?: () => void;
  className?: string;
}

export default function TodoListWidget({
  isOpen: controlledIsOpen,
  onOpenChange,
  onOpenAsPage,
  onHideWidget,
  className = '',
}: TodoListWidgetProps) {
  const { accentColor } = useTheme();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

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

  // 初始化加载本地数据
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

  // 切换完成状态并触发振动
  const handleToggle = async (id: string) => {
    const targetItem = state.items.find((item) => item.id === id);
    if (!targetItem) return;

    const willBeCompleted = !targetItem.completed;
    dispatch({ type: 'toggle', id });

    if (willBeCompleted) {
      // 检查这次勾选之后是否全部完成
      const nextItems = state.items.map((item) =>
        item.id === id ? { ...item, completed: true } : item,
      );
      const isNowAllDone = isAllCompleted(nextItems, state.activeTab);

      if (isNowAllDone) {
        setJustCompletedAll(true);
        setTimeout(() => setJustCompletedAll(false), 3000);
        // 安卓系统振动：触发全胜/成功庆贺震动
        await triggerHaptic('all_complete');
      } else {
        // 安卓系统振动：触发单项完成清脆震动
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
            { text: '手机开启勿扰 / 静音', type: 'checklist' as TodoType },
            { text: '关闭无关浏览器标签页', type: 'checklist' as TodoType },
            { text: '写下本轮番茄钟核心交付物', type: 'checklist' as TodoType },
          ]
        : [
            { text: '梳理今天最重要的 3 件事', type: 'todo' as TodoType },
            { text: '保持专注，完成第一阶段目标', type: 'todo' as TodoType },
          ];
    dispatch({ type: 'batch_add', items: presets });
  };

  return (
    <div className={`pointer-events-auto ${className}`}>
      {/* 展开后的小型 TodoList & Checklist 浮动面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed bottom-20 right-4 z-40 flex w-[90vw] max-w-[340px] flex-col rounded-3xl border border-white/30 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85 md:bottom-6 md:right-6"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header: Tabs + 最小化/关闭 */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-white/10">
              {/* Tab 切换 */}
              <div className="flex items-center gap-1 rounded-full bg-black/5 p-1 dark:bg-white/10">
                <button
                  type="button"
                  aria-label="切换到待办事项"
                  onClick={() => dispatch({ type: 'set_tab', tab: 'todo' })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    state.activeTab === 'todo'
                      ? 'bg-white text-gray-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <FiList className="size-3.5" />
                  <span>待办事项</span>
                </button>
                <button
                  type="button"
                  aria-label="切换到核对清单"
                  onClick={() => dispatch({ type: 'set_tab', tab: 'checklist' })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    state.activeTab === 'checklist'
                      ? 'bg-white text-gray-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <FiCheckCircle className="size-3.5" />
                  <span>核对清单</span>
                </button>
              </div>

              {/* 顶部控制操作 */}
              <div className="flex items-center gap-1">
                {/* 振动反馈控制 */}
                <button
                  type="button"
                  onClick={handleToggleHaptic}
                  className={`size-7 inline-flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                    hapticActive
                      ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title={hapticActive ? '已开启手机振动（点击关闭）' : '已关闭手机振动（点击开启）'}
                >
                  <FiSmartphone className="size-3.5" />
                </button>

                {/* 在独立新页面中打开 */}
                {onOpenAsPage && (
                  <button
                    type="button"
                    onClick={onOpenAsPage}
                    className="size-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 cursor-pointer transition-colors"
                    title="在独立新页面打开"
                    aria-label="在独立新页面打开"
                  >
                    <FiMaximize2 className="size-3.5" />
                  </button>
                )}

                {/* 关闭/收起为小胶囊 */}
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="size-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 cursor-pointer transition-colors"
                  title="收起为桌面小胶囊"
                >
                  <FiMinimize2 className="size-3.5" />
                </button>

                {/* 完全隐藏桌面悬浮挂件 */}
                {onHideWidget && (
                  <button
                    type="button"
                    onClick={onHideWidget}
                    className="size-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/10 dark:hover:text-red-400 cursor-pointer transition-colors"
                    title="隐藏桌面悬浮挂件 (可随时在顶栏菜单重新开启)"
                    aria-label="隐藏桌面悬浮挂件"
                  >
                    <FiEyeOff className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 进度光条与统计 */}
            <div className="pt-3 pb-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-1">
                <span className="font-medium">
                  {state.activeTab === 'todo' ? '待办进度' : '核对进度'}
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: accentColor || '#0ea5e9' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* 全胜庆祝徽章 */}
              <AnimatePresence>
                {justCompletedAll && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.9 }}
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <FiZap className="size-3.5 animate-bounce" />
                    <span>全部完成！手机已振动反馈 🎉</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 列表主体：可拖拽 Reorder.Group */}
            <div className="flex-1 overflow-y-auto pr-1 my-1 min-h-[140px] max-h-[260px] space-y-1.5">
              {currentTabItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  <FiList className="size-8 stroke-[1.5] mb-2 opacity-50" />
                  <p>当前暂无{state.activeTab === 'todo' ? '待办事项' : '核对清单'}</p>
                  <button
                    type="button"
                    onClick={handleLoadFocusPresets}
                    className="mt-3 rounded-full bg-primary-500/10 px-3 py-1 font-semibold text-primary-600 hover:bg-primary-500/20 dark:bg-primary-500/15 dark:text-primary-300 transition-colors cursor-pointer"
                  >
                    载入专注推荐清单
                  </button>
                </div>
              ) : (
                <Reorder.Group
                  as="div"
                  axis="y"
                  values={currentTabItems}
                  onReorder={handleReorder}
                  className="flex flex-col gap-1.5"
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
              )}
            </div>

            {/* 快速添加栏 */}
            <form onSubmit={handleAddItem} className="pt-2">
              <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200/70 bg-white/50 p-1 pl-3 backdrop-blur-md focus-within:border-primary-500 dark:border-white/10 dark:bg-black/30">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    state.activeTab === 'todo'
                      ? '添加新待办，按回车确认...'
                      : '添加检查项，按回车确认...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white disabled:opacity-40 transition-opacity cursor-pointer"
                  aria-label="添加"
                >
                  <FiPlus className="size-4 stroke-[2.5]" />
                </button>
              </div>
            </form>

            {/* 底部小工具条 */}
            <div className="flex items-center justify-between pt-2.5 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-200/40 dark:border-white/5 mt-2">
              {state.activeTab === 'checklist' ? (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'reset_all', itemType: 'checklist' })}
                  className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  title="清空所有勾选，重新开始核对"
                >
                  <FiRotateCcw className="size-3" />
                  <span>重置勾选</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'clear_completed', itemType: 'todo' })}
                  className="inline-flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer"
                  title="清除所有已完成待办"
                >
                  <FiTrash2 className="size-3" />
                  <span>清除已完成</span>
                </button>
              )}

              {/* 振动测试按钮 */}
              <button
                type="button"
                onClick={handleTestVibrate}
                className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                title="调用系统振动 API 测试"
              >
                <FiSmartphone className="size-3" />
                <span>测试振动</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 最小化状态下的悬浮胶囊按钮 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenChange(true)}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-white/30 bg-white/75 px-3.5 py-2 shadow-lg backdrop-blur-2xl dark:border-white/12 dark:bg-black/65 md:bottom-6 md:right-6 cursor-pointer"
            aria-label="打开待办与核对清单"
          >
            <div
              className="flex size-6 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: accentColor || '#0ea5e9' }}
            >
              <FiCheckCircle className="size-3.5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                待办清单
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount} 完成
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
