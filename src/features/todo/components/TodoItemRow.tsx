import { useState, useRef, useEffect } from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import { FiCheck, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { RxDragHandleDots2 } from 'react-icons/rx';
import type { TodoItem } from '../types';
import { useTranslation } from '@/i18n/useTranslation';

interface TodoItemRowProps {
  item: TodoItem;
  accentColor?: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDragEnd?: () => void;
}

export default function TodoItemRow({
  item,
  accentColor = '#0ea5e9',
  onToggle,
  onDelete,
  onEdit,
  onDragEnd,
}: TodoItemRowProps) {
  const { t, currentLang } = useTranslation();
  const dragControls = useDragControls();
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

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={`group relative flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 transition-colors select-none ${
        item.completed
          ? 'border-black/5 bg-black/5 dark:border-white/5 dark:bg-white/5 opacity-75'
          : 'border-white/20 bg-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
      } backdrop-blur-md shadow-xs`}
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="inline-flex size-6 shrink-0 touch-none cursor-grab items-center justify-center rounded text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        aria-label={t('todo.dragReorder')}
        title={t('todo.dragReorder')}
      >
        <RxDragHandleDots2 className="size-4.5 text-current" />
      </button>

      {/* 完成勾选框 */}
      <motion.button
        type="button"
        onClick={() => onToggle(item.id)}
        whileTap={{ scale: 0.85 }}
        className="relative flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer"
        style={{
          borderColor: item.completed ? accentColor : undefined,
          backgroundColor: item.completed ? accentColor : 'transparent',
        }}
        aria-label={
          currentLang === 'en-US'
            ? `${item.completed ? t('todo.itemAriaCompleted') : t('todo.itemAriaUncompleted')}: ${item.text}`
            : `将${item.text}${item.completed ? t('todo.itemAriaCompleted') : t('todo.itemAriaUncompleted')}`
        }
      >
        {item.completed && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <FiCheck className="size-3.5 text-white stroke-[3]" />
          </motion.div>
        )}
      </motion.button>

      {/* 文本内容与内联编辑 */}
      <div className="flex-1 min-w-0">
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
          <span
            onDoubleClick={() => setIsEditing(true)}
            className={`block truncate text-xs font-medium cursor-pointer transition-all ${
              item.completed
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-100'
            }`}
            title={`${item.text} (${t('todo.doubleClickEdit')})`}
          >
            {item.text}
          </span>
        )}
      </div>

      {/* 快捷操作：编辑与删除 */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="size-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer transition-colors"
            title={t('todo.edit')}
            aria-label={t('todo.edit')}
          >
            <FiEdit2 className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="size-6 inline-flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
          title={t('todo.delete')}
          aria-label={t('todo.delete')}
        >
          <FiTrash2 className="size-3" />
        </button>
      </div>
    </Reorder.Item>
  );
}
