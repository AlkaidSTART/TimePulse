import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiClock,
  FiCheckSquare,
  FiArrowRight,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiUser,
  FiHeart,
  FiZap,
} from 'react-icons/fi';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import { readTodoItems } from '@/features/todo/todoStorage';
import { triggerHaptic } from '@/services/vibration';
import solarlunar from 'solarlunar';
import {
  getCurrentTimeSlot,
  getGreetingForUser,
  INSPIRATIONAL_QUOTES,
  type TimeSlotConfig,
} from '../cheerData';

export default function CheerPage() {
  const shouldReduceMotion = useReducedMotion();
  const { transitionTo } = usePageTransition();
  const { accentColor } = useTheme();
  const {
    nickname,
    customMotto,
    cheerStyle,
    cheerCount,
    boostCheer,
    vibrationEnabled,
  } = usePersonalSettingsStore();

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length));
  const [isCopied, setIsCopied] = useState(false);
  const [justBoosted, setJustBoosted] = useState(false);
  const [pendingTodosCount, setPendingTodosCount] = useState(0);

  // 每秒更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取待办数
  useEffect(() => {
    try {
      const items = readTodoItems();
      setPendingTodosCount(items.filter((i) => !i.completed).length);
    } catch {
      // ignore
    }
  }, []);

  // 当前时间段配置
  const timeSlot: TimeSlotConfig = useMemo(() => {
    return getCurrentTimeSlot(currentTime);
  }, [currentTime]);

  // 根据时间和设置生成的温暖打气语
  const greetingText = useMemo(() => {
    return getGreetingForUser(timeSlot, nickname, cheerStyle);
  }, [timeSlot, nickname, cheerStyle]);

  // 格式化时间与日期（轻量精致）
  const timeString = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return { hours, minutes, seconds };
  }, [currentTime]);

  const dateInfo = useMemo(() => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth() + 1;
    const date = currentTime.getDate();
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayOfWeek = dayNames[currentTime.getDay()];

    let lunarText = '';
    try {
      const lunar = solarlunar.solar2lunar(year, month, date);
      if (typeof lunar === 'object' && lunar !== null) {
        lunarText = `农历${lunar.monthCn}${lunar.dayCn}`;
      }
    } catch {
      // fallback
    }

    return {
      formattedDate: `${month}月${date}日`,
      fullDate: `${year}年${month}月${date}日`,
      dayOfWeek,
      lunarText,
    };
  }, [currentTime]);

  const currentQuote = INSPIRATIONAL_QUOTES[quoteIndex] || INSPIRATIONAL_QUOTES[0];

  // 打气充能
  const handleBoostCheer = useCallback(() => {
    if (vibrationEnabled) {
      void triggerHaptic('item_complete');
    }
    boostCheer();
    setJustBoosted(true);
    setTimeout(() => setJustBoosted(false), 1200);
  }, [boostCheer, vibrationEnabled]);

  // 切换金句
  const handleNextQuote = useCallback(() => {
    setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
  }, []);

  // 复制金句
  const handleCopyQuote = useCallback(() => {
    const textToCopy = `“${currentQuote.text}” —— ${currentQuote.author}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1800);
      });
    }
  }, [currentQuote]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto px-4 py-8 md:py-12 select-none">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 sm:gap-6">
        
        {/* 顶部：极简雅致的时间与日期 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center gap-1.5 text-center"
        >
          {/* 精致克制的时间展示（字号大小适中） */}
          <div className="flex items-baseline gap-1 font-mono tracking-tight font-medium text-gray-800 dark:text-gray-100">
            <span className="text-3xl sm:text-4xl tabular-nums">
              {timeString.hours}
            </span>
            <span className="text-2xl sm:text-3xl opacity-40 animate-pulse text-primary-500">
              :
            </span>
            <span className="text-3xl sm:text-4xl tabular-nums">
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[11px] font-medium text-gray-600 dark:text-gray-300">
              <span className="size-1.5 rounded-full bg-primary-500" />
              {timeSlot.name}
            </span>
          </div>
        </motion.div>

        {/* 核心问候与打气卡片（简约轻盈，无臃肿厚重边框） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative w-full rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/60 dark:bg-white/[0.04] p-5 sm:p-6 text-center backdrop-blur-xl shadow-xs"
        >
          <div className="relative z-10 flex flex-col items-center">
            {/* 舒适适中的问候语（去除了过大的粗暴加粗标题） */}
            <h1 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 leading-relaxed max-w-lg">
              {greetingText}
            </h1>

            {/* 关怀贴心健康小提示 */}
            <p className="mt-2 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 leading-normal max-w-md">
              {timeSlot.careTip}
            </p>

            {/* 座右铭（简约微标签，若有） */}
            {customMotto && (
              <div className="mt-3 px-3 py-1 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] text-xs text-gray-500 dark:text-gray-400 italic">
                “{customMotto}”
              </div>
            )}

            {/* 打气轻交互按钮 */}
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
                onClick={handleBoostCheer}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-white shadow-xs cursor-pointer transition-colors"
                style={{
                  backgroundColor: accentColor || '#10A37F',
                }}
              >
                <FiZap className={`size-3.5 ${justBoosted ? 'animate-bounce text-yellow-200' : ''}`} />
                <span>为今天打气</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[11px] font-mono">
                  +{cheerCount}
                </span>
              </motion.button>
            </div>

            {/* 充能轻反馈 */}
            <AnimatePresence>
              {justBoosted && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                >
                  <FiHeart className="size-2.5 text-red-500 animate-ping" />
                  <span>元气充能成功，加油！</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 今日灵感一言（极简便签风格） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative w-full rounded-2xl border border-black/[0.05] dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span className="size-1.5 rounded-full bg-primary-500" />
              <span>今日灵感</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyQuote}
                title="复制此句"
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {isCopied ? (
                  <>
                    <FiCheck className="size-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">已复制</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="size-3" />
                    <span>复制</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleNextQuote}
                title="换一句"
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <FiRefreshCw className="size-3" />
                <span>换一句</span>
              </button>
            </div>
          </div>

          <div className="pt-0.5">
            <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-serif italic">
              “{currentQuote.text}”
            </p>
            <div className="mt-1.5 text-right text-[11px] text-gray-400 dark:text-gray-500">
              —— {currentQuote.author}
            </div>
          </div>
        </motion.div>

        {/* 底部简约胶囊快捷入口（替代原本庞大的两个大卡片） */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap items-center justify-center gap-2 pt-1"
        >
          {/* 前往时钟主页胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('main')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/10 transition-colors cursor-pointer"
          >
            <FiClock className="size-3.5 text-primary-500" />
            <span>时钟主页</span>
            <FiArrowRight className="size-3 text-gray-400" />
          </button>

          {/* 前往待办清单胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('todo')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/10 transition-colors cursor-pointer"
          >
            <FiCheckSquare className="size-3.5 text-emerald-500" />
            <span>今日待办</span>
            {pendingTodosCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                {pendingTodosCount}
              </span>
            )}
            <FiArrowRight className="size-3 text-gray-400" />
          </button>

          {/* 个人设置胶囊 */}
          <button
            type="button"
            onClick={() => transitionTo('settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/10 transition-colors cursor-pointer"
          >
            <FiUser className="size-3.5 text-gray-400" />
            <span>个人设置</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
}
