import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FiClock,
  FiCheckSquare,
  FiArrowRight,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiUser,
} from 'react-icons/fi';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useFullscreen } from '@/app/providers/FullscreenProvider';
import { readTodoItems } from '@/features/todo/todoStorage';
import { cn } from '@/lib/utils';
import { TextEffect } from '@/components/core/text-effect';
import solarlunar from 'solarlunar';
import {
  getCurrentTimeSlot,
  INSPIRATIONAL_QUOTES,
  type TimeSlotConfig,
} from '../cheerData';
import { useQuotesStore } from '@/stores/useQuotesStore';
import { formatQuoteAuthor, formatQuoteForCopy } from '@/services/quotes';
import { useTranslation } from '@/i18n/useTranslation';

// 15秒无限轮播间隔（落在用户期望的10-20s区间，兼顾阅读节奏与动态感）
const QUOTE_AUTO_ROTATE_MS = 15000;

/**
 * 时钟与日期区域：独立持有每秒状态并只在页面可见时走表。
 * 隔离开秒级重渲染，父组件（金句卡片、快捷入口）不再每秒跟着渲染。
 */
const CheerClock = memo(function CheerClock() {
  const { t, currentLang } = useTranslation();
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => setCurrentTime(new Date());

    const start = () => {
      if (timer !== null) return;
      tick();
      timer = setInterval(tick, 1000);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 当前时间段配置
  const timeSlot: TimeSlotConfig = useMemo(() => getCurrentTimeSlot(currentTime), [currentTime]);

  // 格式化时间与日期（轻量精致）
  const timeString = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return { hours, minutes, seconds };
  }, [currentTime]);

  const dateKey = `${currentTime.getFullYear()}-${currentTime.getMonth() + 1}-${currentTime.getDate()}`;
  const dateInfo = useMemo(() => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth() + 1;
    const date = currentTime.getDate();
    const dayIndex = currentTime.getDay();
    const dayKeys = [
      'cheer.weekdaySun',
      'cheer.weekdayMon',
      'cheer.weekdayTue',
      'cheer.weekdayWed',
      'cheer.weekdayThu',
      'cheer.weekdayFri',
      'cheer.weekdaySat',
    ];
    const defaultDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayOfWeek = t(dayKeys[dayIndex], defaultDays[dayIndex]);

    let lunarText = '';
    try {
      const lunar = solarlunar.solar2lunar(year, month, date);
      if (typeof lunar === 'object' && lunar !== null) {
        const prefix = t('cheer.lunarPrefix', '农历');
        lunarText = `${prefix} ${lunar.monthCn}${lunar.dayCn}`;
      }
    } catch {
      // fallback
    }

    const isZh = currentLang === 'zh-CN';
    const formattedDate = isZh
      ? `${month}月${date}日`
      : currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = isZh
      ? `${year}年${month}月${date}日`
      : currentTime.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return {
      formattedDate,
      fullDate,
      dayOfWeek,
      lunarText,
    };
  }, [dateKey, currentLang, t, currentTime]);

  const timeSlotName = useMemo(() => {
    const slotKeyMap: Record<string, string> = {
      early_morning: 'cheer.timeSlotEarlyMorning',
      morning: 'cheer.timeSlotMorning',
      noon: 'cheer.timeSlotNoon',
      afternoon: 'cheer.timeSlotAfternoon',
      evening: 'cheer.timeSlotEvening',
      night: 'cheer.timeSlotNight',
      late_night: 'cheer.timeSlotLateNight',
    };
    const key = slotKeyMap[timeSlot.id];
    return key ? t(key, timeSlot.name) : timeSlot.name;
  }, [timeSlot, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center gap-2 text-center"
    >
      {/* 精致克制的时间展示（字号大小适中） */}
      <div className="flex items-baseline gap-1 font-mono tracking-tight font-medium text-gray-800 dark:text-gray-100">
        <span className="text-4xl sm:text-5xl tabular-nums">
          {timeString.hours}
        </span>
        <span className="text-3xl sm:text-4xl opacity-40 animate-pulse text-primary-500">
          :
        </span>
        <span className="text-4xl sm:text-5xl tabular-nums">
          {timeString.minutes}
        </span>
        <span className="text-xs sm:text-sm opacity-50 tabular-nums ml-1 font-normal text-gray-500 dark:text-gray-400">
          {timeString.seconds}
        </span>
      </div>

      {/* 极简日期与时段标签 */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-normal">
        <span>{dateInfo.fullDate}</span>
        <span>·</span>
        <span>{dateInfo.dayOfWeek}</span>
        {dateInfo.lunarText && (
          <>
            <span>·</span>
            <span>{dateInfo.lunarText}</span>
          </>
        )}
        <span>·</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[11px] font-medium text-gray-600 dark:text-gray-300">
          {timeSlotName}
        </span>
      </div>
    </motion.div>
  );
});

export default function CheerPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { isFullscreen, isHeaderVisible } = useFullscreen();
  const { t } = useTranslation();

  const quotes = useQuotesStore((s) => s.quotes);
  const currentIndex = useQuotesStore((s) => s.currentIndex);
  const loadQuotes = useQuotesStore((s) => s.loadQuotes);
  const nextQuote = useQuotesStore((s) => s.nextQuote);

  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingTodosCount, setPendingTodosCount] = useState(0);

  // 页面挂载时从云端数据库动态同步最新名言库
  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // 获取待办数
  useEffect(() => {
    try {
      const items = readTodoItems();
      setPendingTodosCount(items.filter((i) => !i.completed).length);
    } catch {
      // ignore
    }
  }, []);

  const currentQuote = quotes[currentIndex] || quotes[0] || INSPIRATIONAL_QUOTES[0];
  const displayAuthor = useMemo(() => formatQuoteAuthor(currentQuote), [currentQuote]);

  const lastSwitchTimeRef = useRef(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理所有挂起的定时器
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // 鼠标与触摸交互防抖：进入立即响应暂停，离开提供 200ms 缓冲防抖，防止短时间误划启停
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  }, []);

  // 切换金句（支持手动点击防抖节流与自动轮播触发）
  const handleNextQuote = useCallback((manual = false) => {
    const now = Date.now();
    // 手动点击防抖/节流：450ms 内忽略重复高频点击，防止高频误触
    if (manual && now - lastSwitchTimeRef.current < 450) {
      return;
    }
    lastSwitchTimeRef.current = now;

    if (manual) {
      setIsRefreshing(true);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }

    nextQuote(manual);
  }, [nextQuote]);

  // 15秒无限轮播定时器（悬停、已复制或页面不可见时暂停，移开后恢复计时）
  useEffect(() => {
    if (isHovered || isCopied) return;

    const timer = setInterval(() => {
      if (document.hidden) return;
      handleNextQuote(false);
    }, QUOTE_AUTO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [currentIndex, isHovered, isCopied, handleNextQuote]);

  // 复制金句（防抖保护，处于复制反馈态时忽略重复点击）
  const handleCopyQuote = useCallback(() => {
    if (isCopied) return;

    const textToCopy = formatQuoteForCopy(currentQuote);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 1800);
      }).catch(() => {
        // clipboard failure fallback
      });
    }
  }, [currentQuote, isCopied]);

  return (
    <div
      data-page-view="cheer"
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center overflow-y-auto px-4 select-none',
        isFullscreen && !isHeaderVisible
          ? 'py-4 md:py-6'
          : 'py-6 lg:py-8 pb-24 lg:pb-16 landscape:py-2 landscape:pb-14'
      )}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 sm:gap-6 my-auto">
        
        {/* 顶部：极简雅致的时间与日期（向下微调位移，舒展优雅） */}
        <CheerClock />

        {/* 今日灵感一言（15s无限轮播卡片，悬停暂停，集成细腻流转动效） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseEnter}
          onTouchEnd={handleMouseLeave}
          onTouchCancel={handleMouseLeave}
          className="relative w-full rounded-2xl border border-black/[0.05] dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl min-h-[156px] sm:min-h-[144px] h-auto flex flex-col justify-between overflow-hidden group select-none"
        >
          <div className="flex items-center justify-end pb-2 mb-2 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isCopied}
                onClick={handleCopyQuote}
                title={t('cheer.copyQuote', '复制此句')}
                className={cn(
                  'flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95',
                  isCopied && 'cursor-default'
                )}
              >
                {isCopied ? (
                  <>
                    <FiCheck className="size-3.5 sm:size-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{t('cheer.copied', '已复制')}</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="size-3.5 sm:size-4" />
                    <span>{t('cheer.copy', '复制')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => handleNextQuote(true)}
                title={t('cheer.newQuote', '换一句')}
                className={cn(
                  'flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95',
                  isRefreshing && 'opacity-60 cursor-not-allowed'
                )}
              >
                <FiRefreshCw className={cn('size-3.5 sm:size-4 transition-transform duration-500', isRefreshing && 'rotate-180')} />
                <span>{t('cheer.newQuote', '换一句')}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-[64px] pt-1">
            <div className="flex-1 flex items-center py-1">
              <TextEffect
                key={currentQuote.text}
                per="char"
                preset="fade-in-blur"
                speedReveal={1.6}
                speedSegment={1.2}
                className="w-full text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-serif select-text"
              >
                {`“${currentQuote.text}”`}
              </TextEffect>
            </div>
            <motion.div
              key={`author-${currentQuote.author}-${currentQuote.source || ''}-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="mt-2 text-right text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 shrink-0 select-text"
            >
              —— {displayAuthor}
            </motion.div>
          </div>
        </motion.div>

        {/* 底部简约胶囊快捷入口 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="flex flex-wrap items-center justify-center gap-2.5 pt-0.5"
        >
          {/* 前往时钟主页胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('main')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/10 dark:bg-white/[0.05] hover:bg-white/20 dark:hover:bg-white/[0.1] border border-black/15 cream:border-stone-400/40 dark:border-white/20 hover:border-black/25 dark:hover:border-white/35 backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <FiClock className="size-4 sm:size-4.5 text-primary-500" />
            <span>{t('cheer.homeNav', '时钟主页')}</span>
            <FiArrowRight className="size-3.5 text-gray-400" />
          </button>

          {/* 前往待办清单胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('todo')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/10 dark:bg-white/[0.05] hover:bg-white/20 dark:hover:bg-white/[0.1] border border-black/15 cream:border-stone-400/40 dark:border-white/20 hover:border-black/25 dark:hover:border-white/35 backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <FiCheckSquare className="size-4 sm:size-4.5 text-emerald-500" />
            <span>{t('cheer.todoNav', '今日待办')}</span>
            {pendingTodosCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold">
                {pendingTodosCount}
              </span>
            )}
            <FiArrowRight className="size-3.5 text-gray-400" />
          </button>

          {/* 个人设置胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('settings')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/10 dark:bg-white/[0.05] hover:bg-white/20 dark:hover:bg-white/[0.1] border border-black/15 cream:border-stone-400/40 dark:border-white/20 hover:border-black/25 dark:hover:border-white/35 backdrop-blur-md transition-all cursor-pointer active:scale-95"
          >
            <FiUser className="size-4 sm:size-4.5 text-gray-400" />
            <span>{t('cheer.settingsNav', '个人设置')}</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
}
