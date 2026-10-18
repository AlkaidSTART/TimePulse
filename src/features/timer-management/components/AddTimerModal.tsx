import { useCallback, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCalendar, FiClock, FiGlobe, FiCheck, FiPlus, FiMinus } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTranslation } from '@/i18n/useTranslation';
import DatePicker, { type DatePickerChangeEvent } from '@/components/composed/DatePicker';
import TimezoneSelectionModal from '@/features/world-clock/components/TimezoneSelectionModal';
import { Button } from '@/components/ui/button';
import { AutoResizer, AutoTransition } from '@/components/ui';
import { LinearDialogTransition } from '@/components/composed';
import { cn } from '@/lib/utils';
import type { Holiday } from '@/domain/timer';
import { getLocalizedHolidayName } from '@/domain/holidays';
import { useI18n } from '@/context/I18nContext';
import { PRESET_COLORS } from '@/constants/colors';

const presetColors = PRESET_COLORS;

type AddTimerModalProps = {
  onClose: () => void;
  onBack?: () => void;
  embedded?: boolean;
  initialMode?: 'short' | 'long';
};

type CountdownFormData = {
  name: string;
  targetDate: string;
  targetTime: string;
  timezone: string;
  color: string;
};

export default function AddTimerModal({
  onClose,
  onBack,
  embedded = false,
  initialMode = 'short',
}: AddTimerModalProps) {
  const { addTimer, holidaysList: rawHolidaysList } = useTimers();
  const holidaysList = rawHolidaysList;
  const { accentColor } = useTheme();
  const { t } = useTranslation();
  const { currentLang } = useI18n();

  const [mode, setMode] = useState<'short' | 'long'>(initialMode);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHolidaysList, setShowHolidaysList] = useState(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [step, setStep] = useState(1); // 1: 基本信息, 2: 选择颜色, 3: 完成
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);

  // 短期倒计时状态 (时、分、秒)
  const [shortHours, setShortHours] = useState(0);
  const [shortMinutes, setShortMinutes] = useState(25);
  const [shortSeconds, setShortSeconds] = useState(0);
  const [shortName, setShortName] = useState('');

  const totalShortSeconds = shortHours * 3600 + shortMinutes * 60 + shortSeconds;

  const goToStep = (nextStep: number) => {
    setStepDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  // 随机选择一个预设颜色作为默认
  const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];

  const [formData, setFormData] = useState<CountdownFormData>({
    name: '',
    targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 默认明天
    targetTime: '00:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    color: randomColor,
  });

  // 处理长期倒计时表单输入变化
  const handleChange = (e: ChangeEvent<HTMLInputElement> | DatePickerChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 设置颜色
  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  // 处理时区选择
  const handleTimezoneSelect = useCallback((timezone: string, _city: string, _country: string) => {
    setFormData(prev => ({ ...prev, timezone }));
    setShowTimezoneModal(false);
  }, []);

  // 选择节假日
  const handleSelectHoliday = (holiday: Holiday) => {
    const date = new Date(holiday.date);
    setFormData({
      name: holiday.name,
      targetDate: date.toISOString().slice(0, 10),
      targetTime: date.toTimeString().slice(0, 5),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      color: holiday.color,
    });
    setShowHolidaysList(false);
  };

  const getSuggestedName = (h: number, m: number, s: number): string => {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}${t('time.hour', '小时')}`);
    if (m > 0) parts.push(`${m}${t('time.minute', '分钟')}`);
    if (s > 0) parts.push(`${s}${t('time.second', '秒')}`);
    if (parts.length === 0) return t('timer.countdown', '倒计时');
    return `${parts.join('')}${t('timer.countdown', '倒计时')}`;
  };

  const formatShortDuration = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${t('time.hour', '小时')}`);
    if (m > 0) parts.push(`${m} ${t('time.minute', '分钟')}`);
    if (s > 0 || parts.length === 0) parts.push(`${s} ${t('time.second', '秒')}`);
    return parts.join(' ');
  };

  // 提交表单
  const handleSubmit = () => {
    if (mode === 'short') {
      if (totalShortSeconds <= 0) return;
      const targetDateObj = new Date(Date.now() + totalShortSeconds * 1000);
      const finalName = shortName.trim() || getSuggestedName(shortHours, shortMinutes, shortSeconds);

      const timerData = {
        name: finalName,
        type: 'countdown' as const,
        countdownType: 'short' as const,
        durationSeconds: totalShortSeconds,
        targetDate: targetDateObj.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        color: formData.color,
      };

      addTimer(timerData);
      goToStep(3);
    } else {
      const targetDateObj = new Date(`${formData.targetDate}T${formData.targetTime}`);

      const timerData = {
        name: formData.name,
        type: 'countdown' as const,
        countdownType: 'long' as const,
        targetDate: targetDateObj.toISOString(),
        timezone: formData.timezone,
        color: formData.color,
      };

      addTimer(timerData);
      goToStep(3);
    }

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const isStep1Valid =
    mode === 'short'
      ? totalShortSeconds > 0
      : Boolean(formData.name && formData.targetDate && formData.targetTime);

  const stepContent = (
    <LinearDialogTransition transitionKey={`countdown-step-${step}`} direction={stepDirection} initial={false}>
      <>
        {step === 1 && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center pb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                {mode === 'short'
                  ? t('modal.countdown.createShort', '创建短期倒计时')
                  : t('modal.countdown.createLong', '创建长期倒计时')}
              </h2>
              <button
                className="p-2 rounded-full btn-glass-hover border border-white/10 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                onClick={onClose}
                aria-label={t('common.close', '关闭')}
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl border border-black/[0.06] dark:border-white/[0.08] mb-5">
              <button
                type="button"
                onClick={() => setMode('short')}
                className={cn(
                  'py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                  mode === 'short'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <FiClock className="size-3.5" />
                <span>{t('modal.countdown.shortTab', '短期倒计时')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('long')}
                className={cn(
                  'py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                  mode === 'long'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                <FiCalendar className="size-3.5" />
                <span>{t('modal.countdown.longTab', '长期倒计时')}</span>
              </button>
            </div>

            {/* Form Content */}
            {mode === 'short' ? (
              <div className="flex flex-col gap-4">
                {/* Short-term Countdown Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('modal.countdown.name', '计时器名称')}
                    </label>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t('modal.countdown.nameOptional', '可选')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder={getSuggestedName(shortHours, shortMinutes, shortSeconds)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:outline-none transition-colors text-sm"
                  />
                </div>

                {/* Hours, Minutes, Seconds Steppers */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    {t('modal.countdown.duration', '倒计时时长')}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Hours */}
                    <div className="flex flex-col items-center bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl p-2.5 sm:p-3">
                      <button
                        type="button"
                        onClick={() => setShortHours((h) => Math.min(99, h + 1))}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.increaseHour', '增加小时')}
                      >
                        <FiPlus className="size-3.5" />
                      </button>
                      <div className="my-1 flex items-center justify-center">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={shortHours}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setShortHours(Number.isNaN(val) ? 0 : Math.max(0, Math.min(99, val)));
                          }}
                          className="w-14 text-center text-2xl font-bold font-mono bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 p-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShortHours((h) => Math.max(0, h - 1))}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.decreaseHour', '减少小时')}
                      >
                        <FiMinus className="size-3.5" />
                      </button>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('time.hour', '小时')}
                      </span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl p-2.5 sm:p-3">
                      <button
                        type="button"
                        onClick={() => setShortMinutes((m) => (m + 1) % 60)}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.increaseMinute', '增加分钟')}
                      >
                        <FiPlus className="size-3.5" />
                      </button>
                      <div className="my-1 flex items-center justify-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={shortMinutes}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setShortMinutes(Number.isNaN(val) ? 0 : Math.max(0, Math.min(59, val)));
                          }}
                          className="w-14 text-center text-2xl font-bold font-mono bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 p-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShortMinutes((m) => (m - 1 + 60) % 60)}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.decreaseMinute', '减少分钟')}
                      >
                        <FiMinus className="size-3.5" />
                      </button>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('time.minute', '分钟')}
                      </span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center bg-white/20 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-2xl p-2.5 sm:p-3">
                      <button
                        type="button"
                        onClick={() => setShortSeconds((s) => (s + 1) % 60)}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.increaseSecond', '增加秒')}
                      >
                        <FiPlus className="size-3.5" />
                      </button>
                      <div className="my-1 flex items-center justify-center">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={shortSeconds}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setShortSeconds(Number.isNaN(val) ? 0 : Math.max(0, Math.min(59, val)));
                          }}
                          className="w-14 text-center text-2xl font-bold font-mono bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 p-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShortSeconds((s) => (s - 1 + 60) % 60)}
                        className="size-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label={t('modal.addTimer.decreaseSecond', '减少秒')}
                      >
                        <FiMinus className="size-3.5" />
                      </button>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        {t('time.seconds', '秒')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mr-0.5 shrink-0">
                      {t('modal.countdown.quickSet', '常用预设')}:
                    </span>
                    {[
                      { label: t('modal.addTimer.preset1m', '1分钟'), h: 0, m: 1, s: 0 },
                      { label: t('modal.addTimer.preset5m', '5分钟'), h: 0, m: 5, s: 0 },
                      { label: t('modal.addTimer.preset10m', '10分钟'), h: 0, m: 10, s: 0 },
                      { label: t('modal.addTimer.preset25m', '25分钟'), h: 0, m: 25, s: 0 },
                      { label: t('modal.addTimer.preset30m', '30分钟'), h: 0, m: 30, s: 0 },
                      { label: t('modal.addTimer.preset1h', '1小时'), h: 1, m: 0, s: 0 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setShortHours(item.h);
                          setShortMinutes(item.m);
                          setShortSeconds(item.s);
                        }}
                        className="px-2.5 py-1 text-xs rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 border border-black/[0.04] dark:border-white/[0.08] transition-colors cursor-pointer active:scale-95"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500 mr-0.5 shrink-0">
                      {t('modal.addTimer.quickFineTune', '快速微调')}:
                    </span>
                    {[
                      { label: t('modal.addTimer.addMinute1', '+1分'), addSec: 60 },
                      { label: t('modal.addTimer.addMinute5', '+5分'), addSec: 300 },
                      { label: t('modal.addTimer.addMinute10', '+10分'), addSec: 600 },
                      { label: t('modal.addTimer.addMinute30', '+30分'), addSec: 1800 },
                      { label: t('modal.addTimer.addHour1', '+1时'), addSec: 3600 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const curTotal = shortHours * 3600 + shortMinutes * 60 + shortSeconds;
                          const newTotal = curTotal + preset.addSec;
                          setShortHours(Math.floor(newTotal / 3600));
                          setShortMinutes(Math.floor((newTotal % 3600) / 60));
                          setShortSeconds(newTotal % 60);
                        }}
                        className="px-2 py-0.5 text-xs rounded-md bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.05] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer active:scale-95"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShortHours(0);
                        setShortMinutes(0);
                        setShortSeconds(0);
                      }}
                      className="px-2 py-0.5 text-xs rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer active:scale-95 ml-auto"
                    >
                      {t('modal.countdown.clear', '清空')}
                    </button>
                  </div>
                </div>

                {/* Duration Preview */}
                <div className="rounded-xl p-3 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 mr-1.5">
                      {t('modal.countdown.totalDuration', '总计时长')}:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalShortSeconds > 0
                        ? formatShortDuration(totalShortSeconds)
                        : t('modal.countdown.minDurationHint', '请至少设置 1 秒的倒计时')}
                    </span>
                  </div>
                  {totalShortSeconds > 0 && (
                    <div className="text-slate-500 dark:text-slate-400">
                      {t('modal.countdown.estimatedEnd', '预计结束')}:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(Date.now() + totalShortSeconds * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Long-term Countdown Form */
              <div className="flex flex-col gap-4">
                {/* Holiday Selector */}
                <div>
                  <button
                    className="w-full glass-card p-3.5 text-left flex items-center hover:bg-white/10 dark:hover:bg-black/10 rounded-xl cursor-pointer"
                    onClick={() => setShowHolidaysList(!showHolidaysList)}
                    data-insightflare-event="holiday_list_toggle"
                    aria-expanded={showHolidaysList}
                    aria-controls="countdown-holiday-list"
                  >
                    <FiCalendar className="mr-2 text-primary-500 shrink-0" />
                    <span className="text-sm">{t('modal.countdown.selectHoliday', '选择常用节假日')}</span>
                  </button>

                  <AutoResizer initial collapsed={!showHolidaysList} repaintOnExpand overflow="hidden">
                    <div id="countdown-holiday-list" className="pt-3" aria-hidden={!showHolidaysList} inert={!showHolidaysList}>
                      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/10 dark:border-white/10 rounded-xl p-3 max-h-60 overflow-y-auto">
                        <div className="flex flex-col gap-2">
                          {holidaysList.map((holiday, index) => (
                            <button
                              key={index}
                              className="w-full rounded-lg p-2 flex items-center justify-between bg-white/5 dark:bg-black/10 backdrop-blur-sm border border-white/10 dark:border-white/10 hover:bg-white/15 dark:hover:bg-black/20 transition-colors cursor-pointer text-sm"
                              onClick={() => handleSelectHoliday(holiday)}
                              data-insightflare-event="holiday_select"
                              data-insightflare-event-holiday={holiday.name}
                            >
                              <span>{holiday.name}</span>
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: holiday.color }}></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AutoResizer>
                </div>

                <form className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                      {t('modal.countdown.name', '计时器名称')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('modal.countdown.namePlaceholder', '例如: 春节倒计时')}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:outline-none transition-colors text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                      {t('modal.countdown.date', '目标日期')}
                    </label>
                    <DatePicker name="targetDate" value={formData.targetDate} onChange={handleChange} required />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                      {t('modal.countdown.time', '目标时间')}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute pl-3.5 text-gray-400 z-10 pointer-events-none">
                        <FiClock className="size-4" />
                      </span>
                      <input
                        type="time"
                        name="targetTime"
                        value={formData.targetTime}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 focus:ring-2 focus:ring-inset focus:ring-primary-500 focus:outline-none transition-colors text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                      {t('modal.timezone.title', '时区')}
                    </label>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors cursor-pointer"
                      onClick={() => setShowTimezoneModal(true)}
                    >
                      <div className="flex items-center">
                        <FiGlobe className="mr-2 text-gray-400" />
                        <span className="text-sm">
                          {formData.timezone === 'Asia/Shanghai'
                            ? t('modal.timezone.chinaTime', '中国标准时间 (UTC+8)')
                            : formData.timezone === 'America/New_York'
                            ? t('modal.timezone.eastTime', '美国东部时间')
                            : formData.timezone === 'Europe/London'
                            ? t('modal.timezone.ukTime', '英国时间')
                            : formData.timezone === 'Europe/Paris'
                            ? t('modal.timezone.centralEuropeTime', '欧洲中部时间')
                            : formData.timezone === 'Asia/Tokyo'
                            ? t('modal.timezone.japanTime', '日本时间')
                            : formData.timezone}
                        </span>
                      </div>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-6 flex justify-between">
              <Button variant="glassSecondary" onClick={onBack ?? onClose}>
                {onBack ? t('common.previous', '上一步') : t('common.cancel', '取消')}
              </Button>
              <Button
                variant="glassPrimary"
                onClick={() => goToStep(2)}
                disabled={!isStep1Valid}
                data-insightflare-event="countdown_step_color"
              >
                {t('common.next', '下一步')}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex justify-between items-center pb-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {t('modal.countdown.selectColor', '选择颜色')}
              </h2>
              <button
                className="p-2 rounded-full btn-glass-hover border border-white/10 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                onClick={onClose}
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="flex justify-center pb-6">
              <div className="w-24 h-24 rounded-full shadow-lg" style={{ backgroundColor: formData.color }}></div>
            </div>

            <div className="pb-6">
              <HexColorPicker color={formData.color} onChange={handleColorChange} className="w-full" />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {presetColors.slice(0, 20).map((color) => (
                <button
                  key={color}
                  className={`w-full aspect-square rounded-full border border-white/50 backdrop-blur-sm dark:border-white/25 cursor-pointer transition-transform hover:scale-105 ${
                    formData.color === color ? 'ring-2 ring-white scale-105' : ''
                  }`}
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 78%, transparent)` }}
                  onClick={() => handleColorChange(color)}
                  data-insightflare-event="countdown_color_preset"
                  data-insightflare-event-color={color}
                ></button>
              ))}
            </div>

            <div className="pt-6 flex justify-between">
              <Button variant="glassSecondary" onClick={() => goToStep(1)}>
                {t('common.previous', '上一步')}
              </Button>
              <Button
                variant="glassPrimary"
                onClick={handleSubmit}
                data-insightflare-event="countdown_create_confirm"
              >
                {t('common.create', '创建')}
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="pb-4">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg"
              >
                <FiCheck className="text-3xl text-white" />
              </motion.div>
            </div>
            <h2 className="w-full pb-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {t('modal.countdown.created', '倒计时已创建')}
            </h2>
            <p className="w-full text-gray-500 dark:text-gray-400">
              {t('modal.countdown.createdDesc', '您的倒计时已成功创建')}
            </p>
          </div>
        )}
      </>
    </LinearDialogTransition>
  );

  const content = (
    <>
      {embedded ? stepContent : <AutoResizer initial overflow="hidden">{stepContent}</AutoResizer>}

      {/* 时区选择弹窗 */}
      <AutoTransition
        portal
        transitionKey={showTimezoneModal ? 'countdown-timezone-open' : 'countdown-timezone-closed'}
        initial={false}
        type="fade"
      >
        {showTimezoneModal ? (
          <TimezoneSelectionModal
            onClose={() => setShowTimezoneModal(false)}
            onSelectTimezone={handleTimezoneSelect}
            title={t('modal.timezone.title', '选择时区')}
          />
        ) : null}
      </AutoTransition>
    </>
  );

  if (embedded) return content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 p-4 flex items-center justify-center z-50 backdrop-blur-sm overflow-x-hidden overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-md p-6 rounded-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
