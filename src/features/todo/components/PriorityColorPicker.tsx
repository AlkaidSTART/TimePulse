import React, { useState, useCallback } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { FiCheck, FiFlag, FiX } from 'react-icons/fi';
import {
  PRIORITY_COLOR_PRESETS,
  findPriorityPreset,
  type PriorityLevel,
} from '../constants/priorityColors';
import { useTranslation } from '@/i18n/useTranslation';
import { triggerHaptic } from '@/services/vibration';

export interface PriorityColorPickerProps {
  color?: string;
  priority?: PriorityLevel;
  onSelect: (color?: string, priority?: PriorityLevel) => void;
  showText?: boolean;
  size?: 'xs' | 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
  title?: string;
}

export default function PriorityColorPicker({
  color,
  priority,
  onSelect,
  showText = false,
  size = 'sm',
  align = 'right',
  className = '',
  title,
}: PriorityColorPickerProps) {
  const { t, currentLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const activePreset = findPriorityPreset(color, priority);

  const handleSelect = useCallback(
    async (presetColor?: string, presetPriority?: PriorityLevel) => {
      onSelect(presetColor, presetPriority);
      setIsOpen(false);
      await triggerHaptic('selection');
    },
    [onSelect],
  );

  const defaultTitle = activePreset
    ? `${currentLang === 'en-US' ? activePreset.nameEn : activePreset.name} (${
        currentLang === 'en-US' ? activePreset.labelEn : activePreset.label
      })`
    : t('todo.setPriority', '设置优先级颜色');

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`group relative inline-flex items-center gap-1.5 rounded-lg transition-all cursor-pointer select-none ${
            color
              ? showText
                ? 'px-2 py-0.5 border shadow-2xs font-medium'
                : 'p-1 border shadow-2xs'
              : 'p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
          } ${size === 'xs' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-[11px]'} ${className}`}
          style={
            color
              ? {
                  backgroundColor: activePreset?.bgLight || `${color}18`,
                  borderColor: activePreset?.borderLight || `${color}40`,
                  color: color,
                }
              : undefined
          }
          title={title || defaultTitle}
          aria-label={title || defaultTitle}
          data-no-swipe="true"
        >
          <FiFlag
            className={`${size === 'xs' ? 'size-3' : 'size-3.5'} shrink-0 transition-transform group-hover:scale-110`}
            style={color ? { color } : undefined}
          />
          {color && showText && (
            <span className="font-semibold tracking-wide">
              {activePreset?.code || 'P'}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align === 'right' ? 'end' : 'start'}
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="z-100 w-56 rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1f]/95 p-2 shadow-xl backdrop-blur-2xl ring-1 ring-black/5 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 弹层标题 */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-black/5 dark:border-white/5">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {t('todo.priorityColorTitle', '优先级标记颜色')}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <FiX className="size-3" />
            </button>
          </div>

          {/* 颜色预设列表 */}
          <div className="mt-1.5 flex flex-col gap-0.5">
            {PRIORITY_COLOR_PRESETS.map((preset) => {
              const isSelected =
                color &&
                (color.toLowerCase() === preset.color.toLowerCase() ||
                  priority === preset.level);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelect(preset.color, preset.level)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-black/5 dark:bg-white/10 font-semibold text-gray-900 dark:text-white'
                      : 'text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* 预设色块 */}
                    <span
                      className="size-3.5 rounded-md shrink-0 shadow-2xs ring-1 ring-black/10 dark:ring-white/20"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">
                        {currentLang === 'en-US' ? preset.nameEn : preset.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                        {currentLang === 'en-US' ? preset.labelEn : preset.label}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <FiCheck
                      className="size-3.5 shrink-0 ml-2"
                      style={{ color: preset.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* 清除优先级标记选项 */}
          {color && (
            <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => handleSelect(undefined, undefined)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-500/10 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <FiX className="size-3" />
                <span>{t('todo.clearPriority', '清除优先级标记')}</span>
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
