import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { RxDragHandleDots2 } from 'react-icons/rx';
import type { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import type { TodoItem, PriorityLevel } from '../types';
import PriorityColorPicker from './PriorityColorPicker';
import { useTranslation } from '@/i18n/useTranslation';

export interface TodoItemRowProps {
  item: TodoItem;
  index?: number;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  accentColor?: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onSetPriority?: (id: string, color?: string, priority?: PriorityLevel) => void;
  onDragEnd?: () => void;
}

export default function TodoItemRow({
  item,
  provided,
  snapshot,
  accentColor = '#0ea5e9',
  onToggle,
  onDelete,
  onEdit,
  onSetPriority,
}: TodoItemRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t, currentLang } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(item.id, trimmed);
    } else {
      setEditText(item.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    ...provided?.draggableProps.style,
    ...(item.color
      ? ({
          '--todo-item-color': item.color,
          '--todo-item-bg': item.completed ? `${item.color}0d` : `${item.color}15`,
          '--todo-item-bg-hover': item.completed ? `${item.color}16` : `${item.color}24`,
          '--todo-item-border': item.completed ? `${item.color}20` : `${item.color}3d`,
          '--todo-item-border-hover': item.completed ? `${item.color}30` : `${item.color}60`,
          backgroundColor: 'var(--todo-item-bg)',
          borderColor: 'var(--todo-item-border)',
        } as React.CSSProperties)
      : {}),
  };

  return (
    <div
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
      style={cardStyle}
      className={`group relative flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 select-none overflow-visible ${
        snapshot?.isDragging
          ? 'shadow-2xl ring-2 ring-primary-500/60 bg-white/95 dark:bg-[#18181b] z-50 scale-[1.01]'
          : item.completed
          ? item.color
            ? 'transition-all opacity-65 hover:[background-color:var(--todo-item-bg-hover)] hover:[border-color:var(--todo-item-border-hover)]'
            : 'transition-all border-black/[0.04] bg-black/[0.02] dark:border-white/[0.04] dark:bg-white/[0.02] opacity-60'
          : item.color
          ? 'transition-all shadow-xs hover:[background-color:var(--todo-item-bg-hover)] hover:[border-color:var(--todo-item-border-hover)]'
          : 'transition-all border-black/[0.06] bg-white/75 hover:bg-white/95 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] shadow-xs'
      } backdrop-blur-md`}
    >
      {/* 左侧颜色预设指示条（标记了颜色时展示） */}
      {item.color && (
        <span
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all pointer-events-none"
          style={{ backgroundColor: item.color }}
        />
      )}

      {/* 拖拽手柄：绑定 @hello-pangea/dnd 的 dragHandleProps */}
      <div
        {...(provided?.dragHandleProps || {})}
        data-no-swipe="true"
        className="inline-flex size-6 shrink-0 touch-none cursor-grab items-center justify-center rounded text-gray-400 hover:text-gray-700 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        aria-label={t('todo.dragReorder', '按住左侧手柄上下拖拽排序')}
        title={t('todo.dragTip', '提示：按住左侧手柄可上下拖拽自由排序')}
      >
        <RxDragHandleDots2 className="size-4.5 text-current pointer-events-none" />
      </div>

      {/* 完成勾选框 */}
      <motion.button
        type="button"
        onClick={() => onToggle(item.id)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.85 }}
        className="relative flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer"
        style={{
          borderColor: item.completed
            ? (item.color || accentColor)
            : item.color
            ? `${item.color}80`
            : undefined,
          backgroundColor: item.completed ? (item.color || accentColor) : 'transparent',
        }}
        aria-label={
          currentLang === 'en-US'
            ? `${item.completed ? t('todo.itemAriaCompleted', 'Mark as incomplete') : t('todo.itemAriaUncompleted', 'Mark as completed')}: ${item.text}`
            : `将${item.text}${item.completed ? t('todo.itemAriaCompleted', '标记为未完成') : t('todo.itemAriaUncompleted', '标记为已完成')}`
        }
      >
        {item.completed && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, rotate: -45 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, rotate: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
          >
            <FiCheck className="size-3.5 text-white stroke-[3]" />
          </motion.div>
        )}
      </motion.button>

      {/* 文本内容与内联编辑 */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-white/70 px-1.5 py-0.5 text-xs text-gray-900 outline-none ring-2 ring-primary-500 dark:bg-black/50 dark:text-white"
          />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              onDoubleClick={() => setIsEditing(true)}
              className={`block truncate text-xs font-medium cursor-pointer transition-all ${
                item.completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-800 dark:text-gray-100'
              }`}
              title={`${item.text} (${t('todo.doubleClickEdit', '双击快速修改')})`}
            >
              {item.text}
            </span>
          </div>
        )}
      </div>

      {/* 快捷操作区：优先级色彩标注、快速编辑与删除 */}
      <div className="flex shrink-0 items-center gap-1 opacity-90 sm:opacity-70 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {onSetPriority && (
          <PriorityColorPicker
            color={item.color}
            priority={item.priority}
            onSelect={(c, p) => onSetPriority(item.id, c, p)}
            size="xs"
            title={
              item.color
                ? t('todo.changePriorityColor', '修改或清除任务配色标记')
                : t('todo.setPriorityColor', '为任务标注优先级配色')
            }
          />
        )}

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="size-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer transition-colors"
            title={t('todo.edit', '编辑')}
            aria-label={t('todo.edit', '编辑')}
          >
            <FiEdit2 className="size-3" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="size-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
          title={t('todo.delete', '删除')}
          aria-label={t('todo.delete', '删除')}
        >
          <FiTrash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}
