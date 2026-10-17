import { useState, useReducer, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
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
  FiEyeOff,
  FiBarChart2,
} from 'react-icons/fi';
import { todoReducer, isAllCompleted } from '../todoReducer';
import {
  readTodoItems,
  writeTodoItems,
  readActiveTodoTab,
  writeActiveTodoTab,
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
  const { t } = useTranslation();
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
  const [inputColor, setInputColor] = useState<string | undefined>();
  const [inputPriority, setInputPriority] = useState<PriorityLevel | undefined>();
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
      const nextItems = state.items.map((item) =>
        item.id === id ? { ...item, completed: true } : item,
      );
      const isNowAllDone = isAllCompleted(nextItems, state.activeTab);

      if (isNowAllDone) {
        setJustCompletedAll(true);
        setTimeout(() => setJustCompletedAll(false), 3000);
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

  const handleTestVibrate = async () => {
    await triggerHaptic('test');
  };

  return (
    <div className={`pointer-events-auto ${className}`}>
      {/* 展开的桌面挂件卡片 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-[calc(5.25rem+var(--tp-safe-bottom,0px))] right-4 z-40 flex w-[calc(100vw-2rem)] sm:w-96 flex-col rounded-3xl border border-white/20 bg-white/75 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#141416]/80 md:bottom-6 md:right-6"
            style={{ maxHeight: 'min(580px, calc(100vh - 120px))' }}
          >
            {/* 顶部标题与控制栏 */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-white/10">
              <div className="flex items-center gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
                <button
                  type="button"
                  aria-label={t('todo.switchToTodo', '切换到待办事项')}
                  onClick={() => dispatch({ type: 'set_tab', tab: 'todo' })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    state.activeTab === 'todo'
                      ? 'bg-white text-gray-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {t('todo.tabTodo', '待办事项')}
                </button>
                <button
                  type="button"
                  aria-label={t('todo.switchToChecklist', '切换到核对清单')}
                  onClick={() => dispatch({ type: 'set_tab', tab: 'checklist' })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    state.activeTab === 'checklist'
                      ? 'bg-white text-gray-900 shadow-xs dark:bg-neutral-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {t('todo.tabChecklist', '核对清单')}
                </button>
              </div>

              {/* 右侧小按钮组 */}
              <div className="flex items-center gap-1">
                {/* 智能按优先级排序 */}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'sort_by_priority' })}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-primary-400 transition-colors cursor-pointer"
                  title={t('todo.sortByPriorityTip', '根据设置的优先级颜色自动由高到低排列')}
                  aria-label={t('todo.sortByPriority', '按优先级排序')}
                >
                  <FiBarChart2 className="size-3.5" />
                </button>

                {/* 触觉反馈开关 */}
                <button
                  type="button"
                  onClick={handleToggleHaptic}
                  className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                    hapticActive
                      ? 'text-emerald-500 hover:bg-emerald-500/10'
                      : 'text-gray-400 hover:bg-black/5 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300'
                  }`}
                  title={
                    hapticActive
                      ? t('todo.hapticOnTip', '手机触觉反馈已开启（点击关闭）')
                      : t('todo.hapticOffTip', '手机触觉反馈已关闭（点击开启）')
                  }
                  aria-label={
                    hapticActive
                      ? t('todo.hapticEnabled', '触觉反馈已开启')
                      : t('todo.hapticDisabled', '触觉反馈已关闭')
                  }
                >
                  <FiSmartphone className="size-3.5" />
                </button>

                {/* 在新页面打开 */}
                {onOpenAsPage && (
                  <button
                    type="button"
                    onClick={onOpenAsPage}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
                    title={t('todo.openInPage', '在独立新页面打开')}
                    aria-label={t('todo.openInPage', '在独立新页面打开')}
                  >
                    <FiMaximize2 className="size-3.5" />
                  </button>
                )}

                {/* 最小化折叠 */}
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
                  title={t('todo.minimize', '收起为桌面小胶囊')}
                  aria-label={t('todo.minimize', '收起为桌面小胶囊')}
                >
                  <FiMinimize2 className="size-3.5" />
                </button>

                {/* 隐藏悬浮球 */}
                {onHideWidget && (
                  <button
                    type="button"
                    onClick={onHideWidget}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title={t(
                      'todo.hideWidget',
                      '隐藏桌面悬浮挂件 (可随时在顶栏菜单重新开启)',
                    )}
                    aria-label={t('todo.hideWidgetAria', '隐藏桌面悬浮挂件')}
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
                  {state.activeTab === 'todo'
                    ? t('todo.todoProgressShort', '待办进度')
                    : t('todo.checklistProgressShort', '核对进度')}
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {completedCount}/{totalCount} ({progressPercent}%)
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-sky-500"
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
                    <FiCheckCircle className="size-3.5 text-emerald-500" />
                    <span>
                      {t('todo.allDoneWidget', '全部任务已顺利完成，已触发触觉反馈')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 列表主体：使用 @hello-pangea/dnd 进行拖拽排序 */}
            <div className="flex-1 overflow-y-auto pr-1 my-1 min-h-[140px] max-h-[260px] space-y-1.5">
              {currentTabItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  <FiList className="size-8 stroke-[1.5] mb-2 opacity-50" />
                  <p>
                    {state.activeTab === 'todo'
                      ? t('todo.emptyTodo', '当前暂无待办事项')
                      : t('todo.emptyChecklist', '当前暂无核对清单')}
                  </p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable
                    droppableId="todo-widget-list"
                    renderClone={(dragProvided, dragSnapshot, rubric) => {
                      const item = currentTabItems[rubric.source.index];
                      if (!item) return null;
                      return (
                        <TodoItemRow
                          item={item}
                          index={rubric.source.index}
                          provided={dragProvided}
                          snapshot={dragSnapshot}
                          accentColor={accentColor}
                          onToggle={handleToggle}
                          onDelete={(id) => dispatch({ type: 'delete', id })}
                          onEdit={(id, text) => dispatch({ type: 'edit', id, text })}
                          onSetPriority={(id, color, priority) =>
                            dispatch({ type: 'set_priority', id, color, priority })
                          }
                        />
                      );
                    }}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex flex-col gap-1.5"
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
                                onToggle={handleToggle}
                                onDelete={(id) => dispatch({ type: 'delete', id })}
                                onEdit={(id, text) => dispatch({ type: 'edit', id, text })}
                                onSetPriority={(id, color, priority) =>
                                  dispatch({ type: 'set_priority', id, color, priority })
                                }
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* 快速添加栏（支持预选优先级颜色） */}
            <form onSubmit={handleAddItem} className="pt-2">
              <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200/70 bg-white/50 p-1 pl-2.5 backdrop-blur-md focus-within:border-primary-500 dark:border-white/10 dark:bg-black/30">
                <PriorityColorPicker
                  color={inputColor}
                  priority={inputPriority}
                  onSelect={(c, p) => {
                    setInputColor(c);
                    setInputPriority(p);
                  }}
                  showText={true}
                  size="xs"
                  align="left"
                  title={t('todo.chooseAddPriority', '为新任务预设优先级颜色')}
                />

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    state.activeTab === 'todo'
                      ? t('todo.placeholderTodoWidget', '添加新待办，按回车确认...')
                      : t('todo.placeholderChecklistWidget', '添加检查项，按回车确认...')
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white disabled:opacity-40 transition-opacity cursor-pointer hover:bg-primary-600 active:bg-primary-700"
                  aria-label={t('todo.add', '添加')}
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
                  title={t('todo.resetAllTip', '清空所有勾选，重新开始核对')}
                >
                  <FiRotateCcw className="size-3" />
                  <span>{t('todo.resetAllShort', '重置勾选')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'clear_completed', itemType: 'todo' })}
                  className="inline-flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer"
                  title={t('todo.clearCompletedTip', '清除所有已完成待办')}
                >
                  <FiTrash2 className="size-3" />
                  <span>{t('todo.clearCompletedShort', '清除已完成')}</span>
                </button>
              )}

              {/* 振动测试按钮 */}
              <button
                type="button"
                onClick={handleTestVibrate}
                className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
                title={t('todo.testVibrateTip', '调用系统振动 API 测试')}
              >
                <FiSmartphone className="size-3" />
                <span>{t('todo.testVibrate', '测试振动')}</span>
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
            className="fixed bottom-[calc(5.25rem+var(--tp-safe-bottom,0px))] right-4 z-40 flex items-center gap-2 rounded-full border border-white/30 bg-white/75 px-3.5 py-2 shadow-lg backdrop-blur-2xl dark:border-white/12 dark:bg-black/65 md:bottom-6 md:right-6 cursor-pointer"
            aria-label={t('todo.openWidgetAria', '打开待办与核对清单')}
          >
            <div className="flex size-6 items-center justify-center rounded-full text-white bg-sky-500">
              <FiCheckCircle className="size-3.5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {t('todo.tabTodo', '待办清单')}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount} {t('todo.completedBadge', '完成')}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
