import { forwardRef, useCallback, useMemo, useState, type ComponentType, type HTMLAttributes } from 'react';
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addYears,
  subYears,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  setMonth as setDateFnsMonth,
  setYear as setDateFnsYear,
} from 'date-fns';
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/components/ui/utils';

export type DatePickerChangeEvent = {
  target: {
    name?: string;
    value: string;
  };
};

export type DatePickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'value'> & {
  name?: string;
  value?: string; // Format: YYYY-MM-DD
  defaultValue?: string;
  onChange?: (event: DatePickerChangeEvent) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  triggerClassName?: string;
  icon?: ComponentType<{ className?: string }>;
  id?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  align?: 'start' | 'center' | 'end';
};

const ZH_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const EN_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseSafeDate(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : null;
}

const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(function DatePicker(
  {
    name,
    value,
    defaultValue,
    onChange,
    onValueChange,
    placeholder,
    disabled = false,
    required = false,
    clearable = true,
    className = '',
    triggerClassName = '',
    icon: Icon = FiCalendar,
    id,
    align = 'start',
    ...props
  },
  ref,
) {
  const { accentColor } = useTheme();
  const { t, currentLang } = useTranslation();
  const isZh = currentLang?.startsWith('zh') ?? true;

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Internal value state if uncontrolled
  const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
  const actualValue = value !== undefined ? value : internalValue;

  const selectedDate = useMemo(() => parseSafeDate(actualValue), [actualValue]);

  // Calendar current view date
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date());

  // When popover opens, sync viewDate with selectedDate (or today)
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      setViewDate(selectedDate || new Date());
      setViewMode('days');
    }
  }, [selectedDate]);

  const emitChange = useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      if (onChange) {
        onChange({
          target: {
            name: name || '',
            value: newValue,
          },
        });
      }
      if (onValueChange) {
        onValueChange(newValue);
      }
    },
    [name, onChange, onValueChange],
  );

  const handleSelectDate = useCallback(
    (day: Date) => {
      const formatted = format(day, 'yyyy-MM-dd');
      emitChange(formatted);
      setViewDate(day);
      setIsOpen(false);
    },
    [emitChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emitChange('');
      setIsOpen(false);
    },
    [emitChange],
  );

  const handleToday = useCallback(() => {
    const today = new Date();
    handleSelectDate(today);
  }, [handleSelectDate]);

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => addMonths(prev, 1));
  }, []);

  const handleSelectMonth = useCallback((monthIndex: number) => {
    setViewDate((prev) => setDateFnsMonth(prev, monthIndex));
    setViewMode('days');
  }, []);

  const handleSelectYear = useCallback((year: number) => {
    setViewDate((prev) => setDateFnsYear(prev, year));
    setViewMode('months');
  }, []);

  // Generate 42 days (6 weeks of 7 days) starting on Sunday
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    while (days.length < 42) {
      days.push(addDays(days[days.length - 1], 1));
    }
    return days.slice(0, 42);
  }, [viewDate]);

  const yearNumber = viewDate.getFullYear();
  const monthNumber = viewDate.getMonth() + 1;

  // 12 years for the year picker
  const yearStart = Math.floor(yearNumber / 12) * 12;
  const yearsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearStart + i);
  }, [yearStart]);

  const weekdays = isZh ? ZH_WEEKDAYS : EN_WEEKDAYS;
  const monthNames = isZh ? ZH_MONTHS : EN_MONTHS;

  const headerTitle = useMemo(() => {
    if (viewMode === 'years') {
      return `${yearStart} - ${yearStart + 11}`;
    }
    if (viewMode === 'months') {
      return `${yearNumber}${isZh ? '年' : ''}`;
    }
    if (isZh) {
      return `${yearNumber}年${monthNumber}月`;
    }
    return `${monthNames[viewDate.getMonth()]} ${yearNumber}`;
  }, [viewMode, yearStart, yearNumber, isZh, monthNumber, monthNames, viewDate]);

  const defaultPlaceholder = placeholder || (isZh ? '选择日期' : 'Select date');

  return (
    <div ref={ref} className={cn('relative inline-block w-full', className)} {...props}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            data-testid="datepicker-trigger"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            disabled={disabled}
            className={cn(
              'group flex h-10 w-full items-center justify-between rounded-xl px-3.5 py-2 text-sm text-left transition-all duration-200 outline-none select-none',
              'bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10',
              'hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/30 dark:hover:border-white/20',
              'focus-visible:ring-2 focus-visible:ring-offset-0',
              disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
              triggerClassName,
            )}
            style={{
              boxShadow: isOpen ? `0 0 0 2px ${accentColor}40` : undefined,
            }}
          >
            <div className="flex items-center space-x-2.5 truncate">
              {Icon && <Icon className="text-gray-400 dark:text-gray-400 size-4 flex-shrink-0" />}
              <span
                className={cn(
                  'truncate',
                  actualValue
                    ? 'font-medium text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-500',
                )}
              >
                {actualValue || defaultPlaceholder}
              </span>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0 text-gray-400">
              {clearable && actualValue && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t('common.clearInput', '清空')}
                  className="rounded-full p-1 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClear(e as unknown as React.MouseEvent);
                    }
                  }}
                >
                  <FiX className="size-3.5" />
                </span>
              )}
              <FiChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  isOpen && 'transform rotate-180',
                )}
                style={{ color: isOpen ? accentColor : undefined }}
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          sideOffset={8}
          className={cn(
            'w-[304px] max-w-[calc(100vw-32px)] p-3.5 rounded-3xl backdrop-blur-2xl transition-all shadow-2xl',
            'bg-white/92 dark:bg-[#16171d]/92 cream:bg-[#faf6ee]/95',
            'border border-black/8 dark:border-white/10 cream:border-[#e2d8c3]',
            'shadow-[0_20px_45px_-10px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.4)_inset]',
            'dark:shadow-[0_24px_50px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset]',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'days') setViewMode('months');
                else if (viewMode === 'months') setViewMode('years');
                else setViewMode('days');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-gray-800 dark:text-gray-100 cream:text-stone-800 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all select-none"
            >
              <span>{headerTitle}</span>
              <FiChevronDown
                className={cn(
                  'size-3.5 text-gray-400 transition-transform duration-200',
                  viewMode !== 'days' && 'rotate-180',
                )}
              />
            </button>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'days') handlePrevMonth();
                  else if (viewMode === 'months') setViewDate((prev) => subYears(prev, 1));
                  else setViewDate((prev) => subYears(prev, 12));
                }}
                aria-label={t('common.prev', '上一页')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
              >
                <FiChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'days') handleNextMonth();
                  else if (viewMode === 'months') setViewDate((prev) => addYears(prev, 1));
                  else setViewDate((prev) => addYears(prev, 12));
                }}
                aria-label={t('common.next', '下一页')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all"
              >
                <FiChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Days View */}
          {viewMode === 'days' && (
            <div>
              {/* Weekday Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {weekdays.map((day, idx) => (
                  <div
                    key={idx}
                    className="h-7 flex items-center justify-center text-xs font-medium text-gray-400 dark:text-gray-500 select-none"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const inCurrentMonth = isSameMonth(day, viewDate);
                  const isDaySelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isDayToday = isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDate(day)}
                      className={cn(
                        'w-9 h-9 rounded-full flex flex-col items-center justify-center text-xs sm:text-sm font-medium transition-all duration-150 relative select-none cursor-pointer',
                        !inCurrentMonth && 'text-gray-300 dark:text-gray-600 font-normal',
                        inCurrentMonth && !isDaySelected && 'text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90',
                        isDaySelected && 'text-white font-bold shadow-md active:scale-95',
                        isDayToday && !isDaySelected && 'font-bold border-2',
                      )}
                      style={
                        isDaySelected
                          ? {
                              backgroundColor: accentColor,
                              boxShadow: `0 4px 12px ${accentColor}44`,
                            }
                          : isDayToday
                            ? {
                                borderColor: accentColor,
                                color: accentColor,
                              }
                            : undefined
                      }
                    >
                      <span>{day.getDate()}</span>
                      {isDayToday && !isDaySelected && (
                        <span
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Months View */}
          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {monthNames.map((monthName, idx) => {
                const isSelectedMonth =
                  selectedDate &&
                  selectedDate.getFullYear() === yearNumber &&
                  selectedDate.getMonth() === idx;
                const isCurrentMonth =
                  new Date().getFullYear() === yearNumber && new Date().getMonth() === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    className={cn(
                      'py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none active:scale-95',
                      !isSelectedMonth &&
                        'text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10',
                      isSelectedMonth && 'text-white font-bold shadow-md',
                      isCurrentMonth && !isSelectedMonth && 'border-2',
                    )}
                    style={
                      isSelectedMonth
                        ? {
                            backgroundColor: accentColor,
                            boxShadow: `0 4px 12px ${accentColor}44`,
                          }
                        : isCurrentMonth
                          ? {
                              borderColor: accentColor,
                              color: accentColor,
                            }
                          : undefined
                    }
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years View */}
          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {yearsList.map((yearItem) => {
                const isSelectedYear = selectedDate && selectedDate.getFullYear() === yearItem;
                const isCurrentYear = new Date().getFullYear() === yearItem;

                return (
                  <button
                    key={yearItem}
                    type="button"
                    onClick={() => handleSelectYear(yearItem)}
                    className={cn(
                      'py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 select-none active:scale-95',
                      !isSelectedYear &&
                        'text-gray-800 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10',
                      isSelectedYear && 'text-white font-bold shadow-md',
                      isCurrentYear && !isSelectedYear && 'border-2',
                    )}
                    style={
                      isSelectedYear
                        ? {
                            backgroundColor: accentColor,
                            boxShadow: `0 4px 12px ${accentColor}44`,
                          }
                        : isCurrentYear
                          ? {
                              borderColor: accentColor,
                              color: accentColor,
                            }
                          : undefined
                    }
                  >
                    {yearItem}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-black/5 dark:border-white/5 select-none">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              {t('common.clear', '清除')}
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-4 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                color: accentColor,
              }}
            >
              {t('common.today', '今天')}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={actualValue}
        required={required}
        disabled={disabled}
      />
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
