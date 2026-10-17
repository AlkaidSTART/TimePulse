import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  FiClock,
  FiCheckSquare,
  FiArrowRight,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiSettings,
  FiHeart,
  FiSun,
  FiZap,
  FiSmile,
} from 'react-icons/fi';
import { LuSparkles } from 'react-icons/lu';
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
    avatar,
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

  // 当前时间段
  const timeSlot: TimeSlotConfig = useMemo(() => {
    return getCurrentTimeSlot(currentTime);
  }, [currentTime]);

  // 根据时间和设置生成的温暖打气语
  const greetingText = useMemo(() => {
    return getGreetingForUser(timeSlot, nickname, cheerStyle);
  }, [timeSlot, nickname, cheerStyle]);

  // 格式化时间与日期
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
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
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
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  }, [currentQuote]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-y-auto px-4 py-6 md:px-8 lg:py-10 select-none">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 md:gap-8">
        
        {/* 顶部：当前时段徽标与日期 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2.5"
        >
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-xs transition-colors ${timeSlot.accentBadge}`}
          >
            <span className="font-semibold">{timeSlot.name}时段</span>
            <span className="opacity-60 text-[11px] font-mono">({timeSlot.timeRange})</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 bg-black/[0.04] dark:bg-white/[0.08] backdrop-blur-md border border-black/[0.06] dark:border-white/10">
            <span>{dateInfo.fullDate}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>{dateInfo.dayOfWeek}</span>
            {dateInfo.lunarText && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                <span className="opacity-80">{dateInfo.lunarText}</span>
              </>
            )}
          </div>
        </motion.div>

        {/* 实时时间数字时钟微缩展示 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex items-baseline gap-1.5 sm:gap-2.5 font-mono tracking-tight font-extrabold text-gray-900 dark:text-white"
        >
          <span className="text-5xl sm:text-7xl md:text-8xl tabular-nums drop-shadow-sm">
            {timeString.hours}
          </span>
          <span className="text-4xl sm:text-6xl md:text-7xl opacity-50 animate-pulse text-primary-500">
            :
          </span>
          <span className="text-5xl sm:text-7xl md:text-8xl tabular-nums drop-shadow-sm">
            {timeString.minutes}
          </span>
          <span className="text-xl sm:text-3xl md:text-4xl opacity-60 tabular-nums ml-1 font-semibold text-gray-500 dark:text-gray-400">
            {timeString.seconds}
          </span>
        </motion.div>

        {/* 核心问候与打气卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative w-full overflow-hidden rounded-3xl border border-black/[0.08] dark:border-white/15 bg-white/70 dark:bg-white/[0.06] p-6 sm:p-8 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          {/* 背景光斑与渐变 */}
          <div
            className={`pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-gradient-to-br ${timeSlot.bgGradient} blur-3xl opacity-70`}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-gradient-to-tl from-primary-500/15 via-rose-500/10 to-transparent blur-3xl opacity-60"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* 用户昵称 */}
            <div className="mb-3 flex items-center gap-2">
              <span className="size-6 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <FiSun className="size-3.5" />
              </span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {nickname ? `致 ${nickname}` : '美好的一天'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
                <LuSparkles className="size-3" /> 元气满满
              </span>
            </div>

            {/* 核心问候大标题 */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white leading-snug max-w-2xl">
              {greetingText}
            </h1>

            {/* 关怀贴心健康小提示 */}
            <p className="mt-3.5 max-w-xl text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              <span className="opacity-90">{timeSlot.careTip}</span>
            </p>

            {/* 个性化座右铭（若有） */}
            {customMotto && (
              <div className="mt-4 px-4 py-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.08] text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">
                “{customMotto}”
              </div>
            )}

            {/* 打气与充能互动区域 */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleBoostCheer}
                className="relative group flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm sm:text-base text-white shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                style={{
                  backgroundColor: accentColor || '#10A37F',
                  boxShadow: `0 8px 24px -4px ${accentColor || '#10A37F'}55`,
                }}
              >
                {/* 镜面高光 */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full pointer-events-none" />
                <FiZap className={`size-4 sm:size-5 ${justBoosted ? 'animate-bounce text-yellow-200' : ''}`} />
                <span>为今天打气充能</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-black/20 text-xs font-mono">
                  +{cheerCount}
                </span>
              </motion.button>

              <button
                type="button"
                onClick={() => transitionTo('settings')}
                className="flex items-center gap-1.5 px-4 py-3 rounded-full text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors border border-black/[0.06] dark:border-white/10"
              >
                <FiSettings className="size-4" />
                <span>个人设置</span>
              </button>
            </div>

            {/* 充能成功即时鼓励弹层 */}
            <AnimatePresence>
              {justBoosted && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25"
                >
                  <FiHeart className="size-3 text-red-500 animate-ping" />
                  <span>元气值充能成功！今天也是满怀希望的一天！</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 核心导向：前往当前时间时钟（满足用户“第二才是显示当前时间”） */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
        >
          {/* 主前往时钟卡片 */}
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => transitionTo('main')}
            className="w-full sm:flex-1 group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] hover:bg-white/95 dark:hover:bg-white/[0.12] shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="size-11 sm:size-12 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                style={{ backgroundColor: accentColor || '#0ea5e9' }}
              >
                <FiClock className="size-5 sm:size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-950 dark:text-white text-base sm:text-lg">
                    查看当前时间与计时
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400">
                    下一站
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  全屏大时钟、专注计时日程与世界时区
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center size-9 rounded-full bg-black/5 dark:bg-white/10 group-hover:translate-x-1 transition-transform">
              <FiArrowRight className="size-4 text-gray-700 dark:text-gray-200" />
            </div>
          </motion.button>

          {/* 待办快捷入口 */}
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => transitionTo('todo')}
            className="w-full sm:w-auto sm:min-w-[200px] group flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/[0.08] hover:bg-white/95 dark:hover:bg-white/[0.12] shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <FiCheckSquare className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-950 dark:text-white text-sm sm:text-base">
                  今日待办
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pendingTodosCount > 0 ? `${pendingTodosCount} 项待完成` : '清单整洁无压力'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center size-8 rounded-full bg-black/5 dark:bg-white/10 group-hover:translate-x-1 transition-transform ml-2">
              <FiArrowRight className="size-3.5 text-gray-700 dark:text-gray-200" />
            </div>
          </motion.button>
        </motion.div>

        {/* 底部每日灵感与治愈金句卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative w-full rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/60 dark:bg-white/[0.04] p-5 backdrop-blur-xl shadow-xs"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/[0.05] dark:border-white/[0.08]">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <span className="size-2 rounded-full bg-primary-500 animate-pulse" />
              <span>今日灵感一言 · Inspiration</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyQuote}
                title="复制此句"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                title="换一句灵感"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <FiRefreshCw className="size-3" />
                <span>换一句</span>
              </button>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed font-serif italic">
              “{currentQuote.text}”
            </p>
            <div className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">
              —— {currentQuote.author}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
