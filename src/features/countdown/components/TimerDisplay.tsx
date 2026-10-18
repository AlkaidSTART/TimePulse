import { Fragment, useState, useEffect, useRef, useMemo, memo, lazy, Suspense, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useTimers } from '@/app/providers/TimerProvider';
import { useFullscreen } from '@/app/providers/FullscreenProvider';
import { useTranslation } from '@/i18n/useTranslation';
import DigitColumn from './DigitColumn';
import TimerLoading from './TimerLoading';
import { addNotification } from '@/services/notificationManager';
import { track, bucketDurationMs } from '@/services/analytics';
import { FiPlay, FiPause, FiSquare, FiFlag, FiList, FiRotateCcw } from 'react-icons/fi';
import {
  getTimerType,
  type CountdownTimer,
  type Lap,
  type StopwatchTimer,
  type Timer,
  type TimerType,
  type TimeValue,
  type WorldClockTimer,
} from '@/domain/timer';
import { splitCalendarDuration, getZonedDateTimeParts } from '@/domain/time';
import { getNextTimerUpdateDelay } from '../timerSchedule';
import { AutoResizer, AutoTransition, type TransitionType } from '@/components/ui';

const LapTimesModal = lazy(() => import('@/features/stopwatch/components/LapTimesModal'));
const StopwatchStopConfirmModal = lazy(() => import('@/features/stopwatch/components/StopwatchStopConfirmModal'));

type DisplayTime = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type FontSize = 'small' | 'medium' | 'large';
type StopwatchAction = 'play' | 'pause' | 'stop' | 'lap';

const toDate = (value: TimeValue | null | undefined): Date => {
  if (value instanceof Date) return new Date(value.getTime());
  if (value === null) return new Date(0);
  return new Date(value ?? Number.NaN);
};

type AnimatedRegionProps = {
  children: ReactNode;
  transitionKey: string;
  type?: TransitionType;
  className?: string;
};

function AnimatedRegion({
  children,
  transitionKey,
  type = 'crossFade',
  className,
}: AnimatedRegionProps) {
  return (
    <AutoResizer
      animateWidth
      initial={false}
      overflow="visible"
      className="flex items-center justify-center"
    >
      <AutoTransition
        transitionKey={transitionKey}
        initial={false}
        type={type}
        className={className}
      >
        {children}
      </AutoTransition>
    </AutoResizer>
  );
}

type CalendarTimeRowsProps = {
  timeValue: DisplayTime;
  showYears: boolean;
  showDays: boolean;
  isValueVisible: boolean;
  trend: -1 | 1;
  color: string;
  fontSize: FontSize;
  labelFontSize: FontSize;
  separatorClassName: string;
  labels: { years: string; months: string; days: string; hours: string; minutes: string; seconds: string };
};

const CalendarTimeRows = memo(function CalendarTimeRows({
  timeValue,
  showYears,
  showDays,
  isValueVisible,
  trend,
  color,
  fontSize,
  labelFontSize,
  separatorClassName,
  labels,
}: CalendarTimeRowsProps) {
  const [calendarExitRevision, setCalendarExitRevision] = useState(0);
  const calendarUnitOptions: Array<{ key: keyof Pick<DisplayTime, 'years' | 'months' | 'days'>; label: string }> = [
    { key: 'years', label: labels.years },
    { key: 'months', label: labels.months },
    { key: 'days', label: labels.days },
  ];
  const calendarUnits = calendarUnitOptions.filter(unit => {
    if (unit.key === 'years') return showYears;
    if (unit.key === 'days') return showDays;
    return timeValue[unit.key] > 0;
  });
  const hasCalendarUnits = calendarUnits.length > 0;
  const hasOnlyDays = calendarUnits.length === 1 && calendarUnits[0].key === 'days';
  const separatorVerticalOffset = labelFontSize === 'small' ? 14 : labelFontSize === 'large' ? 18 : 16;

  const calendarItems = calendarUnits.flatMap((unit, index) => [
    ...(index > 0 ? [{ kind: 'separator' as const, key: `date-separator-${unit.key}` }] : []),
    { kind: 'unit' as const, key: unit.key, unit },
  ]);
  const calendarExitDelay = Math.max(0, (calendarItems.length - 1) * 0.035 + 0.02);

  const renderSeparator = (key: string) => (
    <motion.span
      key={key}
      aria-hidden="true"
      layout="position"
      transition={{ layout: { type: 'tween', duration: 0.24, ease: 'easeOut' } }}
      className={`relative ${separatorClassName} font-light text-gray-400/80 dark:text-gray-500/80 select-none`}
      style={{
        top: -separatorVerticalOffset,
      }}
    >
      :
    </motion.span>
  );

  const renderDigit = (unit: { key: keyof DisplayTime; label: string; cycleAtSixty?: boolean }) => (
    <DigitColumn
      value={timeValue[unit.key]}
      isValueVisible={isValueVisible}
      trend={trend}
      label={unit.label}
      color={color}
      fontSize={fontSize}
      labelFontSize={labelFontSize}
      cycleAtSixty={unit.cycleAtSixty}
    />
  );

  const renderClockRow = (
    units: Array<{ key: keyof DisplayTime; label: string; cycleAtSixty?: boolean }>,
  ) => (
    <motion.div
      className="flex items-center justify-center space-x-2.5 sm:space-x-3.5 md:space-x-4"
      layout="position"
      layoutDependency={calendarExitRevision}
      transition={{ layout: { type: 'tween', duration: 0.24, ease: 'easeOut' } }}
    >
      {units.map((unit, index) => (
        <Fragment key={unit.key}>
          {index > 0 ? renderSeparator(`clock-separator-${unit.key}`) : null}
          {renderDigit(unit)}
        </Fragment>
      ))}
    </motion.div>
  );

  return (
    <motion.div
      className="flex flex-col landscape:flex-row lg:flex-row items-center justify-center"
      layout="position"
      animate={{ rowGap: hasCalendarUnits ? 4 : 0 }}
      transition={{
        duration: 0.32,
        ease: 'easeOut',
        layout: { type: 'tween', duration: 0.24, ease: 'easeOut' },
        rowGap: { type: 'tween', duration: 0.24, ease: 'easeOut' },
      }}
    >
      <motion.div
        layout="position"
        className="flex items-center justify-center"
        transition={{ layout: { type: 'tween', duration: 0.28, ease: 'easeInOut' } }}
      >
        <motion.div
          className="flex items-center justify-center space-x-2.5 sm:space-x-3.5 md:space-x-4"
          layout="position"
          transition={{ layout: { type: 'tween', duration: 0.28, ease: 'easeInOut' } }}
        >
          <AnimatePresence
            initial={false}
            onExitComplete={() => setCalendarExitRevision(revision => revision + 1)}
          >
            {calendarItems.map((item, index) => item.kind === 'separator' ? (
              <motion.span
                key={item.key}
                aria-hidden="true"
                layout="position"
                initial={{ opacity: 0, y: trend < 0 ? -6 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: trend < 0 ? 6 : -6 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.035,
                  ease: 'easeOut',
                  layout: { type: 'tween', duration: 0.28, ease: 'easeInOut' },
                }}
                className={`relative ${separatorClassName} font-light text-gray-400/80 dark:text-gray-500/80 select-none`}
                style={{
                  top: -separatorVerticalOffset,
                }}
              >
                :
              </motion.span>
            ) : (
              <motion.div
                key={item.key}
                layout="position"
                initial={{ opacity: 0, y: trend < 0 ? -10 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: trend < 0 ? 10 : -10 }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.035,
                  ease: 'easeOut',
                  layout: { type: 'tween', duration: 0.28, ease: 'easeInOut' },
                }}
                className="flex items-center"
              >
                {renderDigit(item.unit)}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      <AnimatePresence initial={false}>
        {hasCalendarUnits ? (
          <motion.span
            key="calendar-clock-separator"
            aria-hidden="true"
            layout="position"
            initial={{ opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{
              opacity: 0,
              scaleX: 0.6,
              transition: { duration: 0.2, delay: calendarExitDelay, ease: 'easeOut' },
            }}
            transition={{ duration: 0.2, ease: 'easeOut', layout: { type: 'tween', duration: 0.28, ease: 'easeInOut' } }}
            className={`relative hidden landscape:mx-2 landscape:inline-block lg:mx-2 lg:inline-block ${separatorClassName} font-light text-gray-400/80 dark:text-gray-500/80 select-none`}
            style={{
              top: -separatorVerticalOffset,
            }}
          >
            :
          </motion.span>
        ) : null}
      </AnimatePresence>
      {renderClockRow([
        { key: 'hours', label: labels.hours },
        { key: 'minutes', label: labels.minutes, cycleAtSixty: true },
        { key: 'seconds', label: labels.seconds, cycleAtSixty: true },
      ])}
    </motion.div>
  );
});

function getInitialDisplaySnapshot(timer: Timer | null): {
  timeValue: DisplayTime;
  showYears: boolean;
  showDays: boolean;
} {
  if (!timer) {
    return {
      timeValue: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
      showYears: false,
      showDays: false,
    };
  }

  const now = Date.now();
  const timerType = getTimerType(timer);

  if (timerType === 'worldclock') {
    const parts = getZonedDateTimeParts(now, (timer as WorldClockTimer).timezone);
    return {
      timeValue: {
        years: 0,
        months: 0,
        days: 0,
        hours: parts.hour,
        minutes: parts.minute,
        seconds: parts.second,
      },
      showYears: false,
      showDays: false,
    };
  }

  if (timerType === 'stopwatch') {
    const sw = timer as StopwatchTimer;
    const startTimestamp = sw.startTime === null ? Number.NaN : toDate(sw.startTime).getTime();
    const wallClockEnd = sw.isRunning
      ? now
      : sw.pausedAt
        ? toDate(sw.pausedAt).getTime()
        : startTimestamp;
    const effectiveEnd = wallClockEnd - (sw.totalPausedTime || 0);
    const split = splitCalendarDuration(startTimestamp, effectiveEnd);
    return {
      timeValue: split,
      showYears: split.years > 0,
      showDays: split.days > 0 || split.months > 0 || split.years > 0,
    };
  }

  const cd = timer as CountdownTimer;
  const targetDate = toDate(cd.targetDate);
  if (targetDate.getTime() - now <= 0) {
    return {
      timeValue: { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
      showYears: false,
      showDays: false,
    };
  }
  const split = splitCalendarDuration(now, targetDate.getTime(), cd.timezone);
  return {
    timeValue: split,
    showYears: split.years > 0,
    showDays: split.days > 0 || split.months > 0 || split.years > 0,
  };
}

export default function TimerDisplay() {
  const { getActiveTimer, updateTimer, activeTimerId, timers } = useTimers();
  const activeTimerAtMount = getActiveTimer() as Timer | null;
  const activeTimerTypeAtMount = activeTimerAtMount ? getTimerType(activeTimerAtMount) : null;
  const initialSnapshot = useMemo(() => getInitialDisplaySnapshot(activeTimerAtMount), [activeTimerAtMount?.id]);

  const { isFullscreen, timerFontSize: rawTimerFontSize, labelFontSize: rawLabelFontSize } = useFullscreen();
  const { t, currentLang } = useTranslation();
  const timeLabels = useMemo(() => ({
    years: t('time.years'),
    months: t('time.months'),
    days: t('time.days'),
    hours: t('time.hours'),
    minutes: t('time.minutes'),
    seconds: t('time.seconds'),
  }), [t]);
  const timerFontSize = (rawTimerFontSize || 'medium') as FontSize;
  const labelFontSize = (rawLabelFontSize || 'medium') as FontSize;
  const [timeValue, setTimeValue] = useState<DisplayTime>(() => initialSnapshot.timeValue);
  const [isInitialValuesReady, setIsInitialValuesReady] = useState(() => Boolean(activeTimerAtMount));
  const [isDisplayVisible, setIsDisplayVisible] = useState(false);
  const [showDays, setShowDays] = useState(() => initialSnapshot.showDays);
  const [showYears, setShowYears] = useState(() => initialSnapshot.showYears);
  const [isFinished, setIsFinished] = useState(false);
  const [isRunning, setIsRunning] = useState(() => activeTimerTypeAtMount === 'stopwatch' && (activeTimerAtMount as StopwatchTimer)?.isRunning === true);
  const [isLapModalOpen, setIsLapModalOpen] = useState(false);
  const [isStopwatchStopDialogOpen, setIsStopwatchStopDialogOpen] = useState(false);
  const [timeValueTimerType, setTimeValueTimerType] = useState<TimerType | null>(activeTimerTypeAtMount);
  
  // 使用 ref 跟踪最后计算的时间，避免不必要的重渲染
  const lastTimeRef = useRef<DisplayTime | null>(initialSnapshot.timeValue);
  const activeTimerIdentityRef = useRef<{ id: string; type: TimerType } | null>(
    activeTimerAtMount ? { id: activeTimerAtMount.id, type: activeTimerTypeAtMount! } : null
  );
  const initialValuesReadyRef = useRef(Boolean(activeTimerAtMount));
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 判断两个时间对象是否相等
  const areTimesEqual = (time1: DisplayTime, time2: DisplayTime | null) => {
    return time2 !== null &&
           time1.years === time2.years &&
           time1.months === time2.months &&
           time1.days === time2.days && 
           time1.hours === time2.hours && 
           time1.minutes === time2.minutes && 
           time1.seconds === time2.seconds;
  };

  // 统一的计时计算函数
  const calculateTime = (timer: Timer, now: number, timerChanged: boolean) => {
    // 当页面在后台时，可能会暂停
    if (document.visibilityState !== 'visible') {
      return;
    }
    
    switch (getTimerType(timer)) {
      case 'stopwatch':
        calculateStopwatchTime(timer as StopwatchTimer, now);
        break;
      case 'worldclock':
        calculateWorldClockTime(timer as WorldClockTimer, now);
        break;
      default:
        calculateCountdownTime(timer as CountdownTimer, now, timerChanged);
        break;
    }
  };
  
  // 判断是否只有秒数变化（避免分钟数字不必要的重新渲染）
  const isOnlySecondsChanged = (time1: DisplayTime, time2: DisplayTime) => {
    return time1.years === time2.years &&
           time1.months === time2.months &&
           time1.days === time2.days && 
           time1.hours === time2.hours && 
           time1.minutes === time2.minutes && 
           time1.seconds !== time2.seconds;
  };
  
  // 计算倒计时剩余时间
  const calculateCountdownTime = (timer: CountdownTimer, now: number, timerChanged: boolean) => {
    const targetDate = toDate(timer.targetDate);
    const difference = targetDate.getTime() - now;
    
    if (difference <= 0) {
      // 倒计时结束
      if (!isFinished) {
        setIsFinished(true);
        setTimeValue({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        lastTimeRef.current = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

        try {
          const createdAt = timer.createdAt ? new Date(timer.createdAt).getTime() : null;
          const totalMs = createdAt ? targetDate.getTime() - createdAt : null;
          track('countdown_finished', {
            duration_bucket: totalMs !== null ? bucketDurationMs(totalMs) : 'unknown',
          });
        } catch (e) {}
        
        // 当倒计时结束时发送通知
        try {
          console.log('倒计时结束，尝试发送通知:', timer.name);
          addNotification({
            id: timer.id,
            title: timer.name,
            targetTime: Date.now()
          }).catch(error => {
            console.error('发送倒计时结束通知失败:', error);
          });
        } catch (error) {
          console.error('发送倒计时结束通知失败:', error);
        }
      }

      if (timerChanged) {
        setTimeValue({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        lastTimeRef.current = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        setShowYears(false);
        setShowDays(false);
      }
      return;
    }
    
    // 倒计时未结束
    if (isFinished) {
      setIsFinished(false);
    }
    
    // 将剩余时间按计时器时区拆成完整年月日和时分秒。
    const newTimeLeft = splitCalendarDuration(now, targetDate.getTime(), timer.timezone);
    
    // 只有当时间真正变化时才更新状态
    if (!areTimesEqual(newTimeLeft, lastTimeRef.current)) {
      setTimeValue(newTimeLeft);
      lastTimeRef.current = newTimeLeft;
      setShowYears(newTimeLeft.years > 0);
      setShowDays(newTimeLeft.days > 0 || newTimeLeft.months > 0 || newTimeLeft.years > 0);
    }
  };
  
  // 计算正计时经过时间
  const calculateStopwatchTime = (timer: StopwatchTimer, now: number) => {
    const startTimestamp = timer.startTime === null ? Number.NaN : toDate(timer.startTime).getTime();
    const wallClockEnd = timer.isRunning
      ? now
      : timer.pausedAt
        ? toDate(timer.pausedAt).getTime()
        : startTimestamp;
    const effectiveEnd = wallClockEnd - (timer.totalPausedTime || 0);
    const newTimeValue = splitCalendarDuration(startTimestamp, effectiveEnd);
    
    // 智能更新：只有当时间确实变化时才更新状态
    // 对于正计时，我们特别处理避免不必要的重新渲染
    if (!areTimesEqual(newTimeValue, lastTimeRef.current)) {
      // 如果只是秒数变化，我们延迟更新其他数字避免闪烁
      if (timer.type === 'stopwatch' && lastTimeRef.current && isOnlySecondsChanged(newTimeValue, lastTimeRef.current)) {
        // 只更新秒数
        setTimeValue(prev => ({ ...prev, seconds: newTimeValue.seconds }));
      } else {
        // 全部更新
        setTimeValue(newTimeValue);
      }
      lastTimeRef.current = newTimeValue;
      setShowYears(newTimeValue.years > 0);
      setShowDays(newTimeValue.days > 0 || newTimeValue.months > 0 || newTimeValue.years > 0);
    }
  };
  
  // 计算世界时钟时间
  const calculateWorldClockTime = (timer: WorldClockTimer, now: number) => {
    const parts = getZonedDateTimeParts(now, timer.timezone);
    
    const newTimeValue = { 
      years: 0,
      months: 0,
      days: 0, 
      hours: parts.hour, 
      minutes: parts.minute, 
      seconds: parts.second, 
    };
    
    if (!areTimesEqual(newTimeValue, lastTimeRef.current)) {
      setTimeValue(newTimeValue);
      lastTimeRef.current = newTimeValue;
      setShowYears(false); // 世界时钟不显示年数
      setShowDays(false); // 世界时钟不显示天数
    }
  };
  
  // 主计时逻辑
  useEffect(() => {
    const clearScheduledUpdate = () => {
      if (timerIdRef.current !== null) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    const updateActiveTimer = () => {
      clearScheduledUpdate();
      if (document.visibilityState !== 'visible') return;

      const timer = getActiveTimer() as Timer | null;
      if (!timer) return;

      const timerType = getTimerType(timer);
      const previousIdentity = activeTimerIdentityRef.current;
      const timerChanged = !previousIdentity || previousIdentity.id !== timer.id || previousIdentity.type !== timerType;
      if (timerChanged) {
        activeTimerIdentityRef.current = { id: timer.id, type: timerType };
        // Keep timeValue for NumberFlow's old-to-new animation, but make the
        // next calculation refresh all timer-specific display fields. Update
        // the NumberFlow direction in the same render as that new value.
        lastTimeRef.current = null;
        setTimeValueTimerType(timerType);
        setIsLapModalOpen(false);
        setIsStopwatchStopDialogOpen(false);
        setIsRunning(timerType === 'stopwatch' && (timer as StopwatchTimer).isRunning === true);
        if (timerType !== 'countdown') setIsFinished(false);
      }

      // Use one timestamp for both the displayed value and its next boundary.
      const now = Date.now();
      calculateTime(timer, now, timerChanged);
      if (!initialValuesReadyRef.current) {
        initialValuesReadyRef.current = true;
        setIsInitialValuesReady(true);
      }
      timerIdRef.current = setTimeout(updateActiveTimer, getNextTimerUpdateDelay(timer, now));
    };

    updateActiveTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActiveTimer();
      } else {
        clearScheduledUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearScheduledUpdate();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getActiveTimer, isFinished, isRunning, activeTimerId, timers]);
  
  // 正计时控制函数
  const handleStopwatchControl = (action: StopwatchAction) => {
    const timer = getActiveTimer() as StopwatchTimer | null;
    if (!timer || timer.type !== 'stopwatch') return;
    
    const now = new Date();
    
    switch (action) {
      case 'play':
        if (timer.pausedAt) {
          // 从暂停状态恢复，计算已暂停的总时间
          const pausedDuration = now.getTime() - toDate(timer.pausedAt).getTime();
          const newTotalPausedTime = (timer.totalPausedTime || 0) + pausedDuration;
          updateTimer(timer.id, {
            isRunning: true,
            pausedAt: null,
            totalPausedTime: newTotalPausedTime
          });
        } else {
          // 第一次开始
          updateTimer(timer.id, {
            isRunning: true,
            startTime: timer.startTime || now.toISOString(),
            pausedAt: null,
            totalPausedTime: timer.totalPausedTime || 0
          });
        }
        setIsRunning(true);
        track('stopwatch_play');
        break;

      case 'pause':
        updateTimer(timer.id, {
          isRunning: false,
          pausedAt: now.toISOString()
        });
        setIsRunning(false);
        track('stopwatch_pause');
        break;

      case 'stop':
        updateTimer(timer.id, {
          isRunning: false,
          startTime: now.toISOString(),
          pausedAt: null,
          totalPausedTime: 0,
          laps: [] // 清空分段记录
        });
        setIsRunning(false);
        setTimeValue({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        lastTimeRef.current = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        track('stopwatch_stop');
        break;

      case 'lap':
        // Record lap time
        const startTime = toDate(timer.startTime);
        const elapsedMs = now.getTime() - startTime.getTime() - (timer.totalPausedTime || 0);
        const laps = timer.laps || [];
        // Use a combination of timestamp and random to avoid collision
        const newLap = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now.toISOString(),
          elapsedMs: elapsedMs
        };
        updateTimer(timer.id, {
          laps: [...laps, newLap]
        });
        track('stopwatch_lap', { lap_count: laps.length + 1 });
        break;
    }
  };
  
  const activeTimer = getActiveTimer() as Timer | null;
  const activeTimerType = activeTimer ? getTimerType(activeTimer) : null;
  const displayedTimerType = timeValueTimerType ?? activeTimerType;
  const numberTrend: -1 | 1 = displayedTimerType === 'countdown' ? -1 : 1;
  const activeStopwatchTimer = activeTimer?.type === 'stopwatch'
    ? activeTimer as StopwatchTimer
    : null;

  useEffect(() => {
    if (!isInitialValuesReady || isDisplayVisible || !activeTimer) return undefined;

    // Zero-lag layout stabilization
    const revealTimer = window.setTimeout(() => setIsDisplayVisible(true), 0);
    return () => window.clearTimeout(revealTimer);
  }, [
    isInitialValuesReady,
    isDisplayVisible,
    activeTimer?.id,
    activeTimerType,
    showYears,
    showDays,
    isFinished,
    isRunning,
  ]);

  // 字体大小映射
  const getTimerFontSizeClasses = (): Record<FontSize, string> => {
    if (isFullscreen) {
      // 全屏模式：使用固定大尺寸
      return {
        small: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl landscape:max-md:text-4xl landscape:max-md:sm:text-5xl',
        medium: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl landscape:max-md:text-5xl landscape:max-md:sm:text-6xl',
        large: 'text-7xl sm:text-8xl md:text-9xl landscape:max-md:text-6xl landscape:max-md:sm:text-7xl',
      };
    } else {
      // 普通模式：使用响应式尺寸
      return {
        small: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl landscape:max-md:text-3xl landscape:max-md:sm:text-4xl',
        medium: 'text-[3.25rem] sm:text-6xl md:text-7xl lg:text-8xl landscape:max-md:text-4xl landscape:max-md:sm:text-5xl',
        large: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl landscape:max-md:text-5xl landscape:max-md:sm:text-6xl',
      };
    }
  };

  const getLabelFontSizeClasses = (): Record<FontSize, string> => {
    return {
      small: 'text-sm sm:text-base',
      medium: 'text-base sm:text-lg',
      large: 'text-lg sm:text-xl'
    };
  };

  const timerClasses = getTimerFontSizeClasses();
  const separatorClassName = timerClasses[timerFontSize];
  const labelClasses = getLabelFontSizeClasses();

  if (!activeTimer) {
    return (
      <div className="flex items-center justify-center min-h-[160px] py-12">
        <TimerLoading />
      </div>
    );
  }
  
  // 获取显示标题和描述
  const getTimerTitle = () => {
    switch (activeTimer.type) {
      case 'stopwatch':
        return activeTimer.name;
      case 'worldclock':
        return ''; // 世界时钟不再在时间上方显示标题（时区统一展示在 header 栏）
      default:
        return activeTimer.name;
    }
  };
  
  const getTimerDescription = () => {
    switch (activeTimer.type) {
      case 'stopwatch':
        return isRunning ? t('timer.running') : t('timer.paused');
      case 'worldclock':
        return ''; // 世界时钟不再在时间下方显示 `${country} - ${timezone}`
      default: {
        const cd = activeTimer as CountdownTimer;
        if (cd.countdownType === 'short') {
          const targetTimeStr = toDate(cd.targetDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          return `${t('timer.target')}: ${targetTimeStr}`;
        }
        return `${t('timer.target')}: ${toDate(cd.targetDate).toLocaleString()}`;
      }
    }
  };

  const timerTitle = getTimerTitle();
  
  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-[160px]">
      <AnimatePresence>
        {!isDisplayVisible && (
          <motion.div
            key="timer-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              filter: 'blur(4px)',
              transition: { duration: 0.1, ease: 'easeOut' },
            }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <TimerLoading color={activeTimer.color} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="flex flex-col items-center justify-center text-center px-4 relative z-10 w-full"
        initial={false}
        animate={isDisplayVisible
          ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
          : { opacity: 0, scale: 0.98, y: 14, filter: 'blur(2px)' }}
        transition={{
          y: { type: 'spring', damping: 24, stiffness: 300, mass: 0.5 },
          scale: { type: 'spring', damping: 24, stiffness: 300, mass: 0.5 },
          opacity: { duration: 0.18, ease: 'easeOut' },
          filter: { duration: 0.16, ease: 'easeOut' },
        }}
        aria-hidden={!isDisplayVisible}
        inert={!isDisplayVisible}
      >
        <div className="relative flex flex-col items-center">
      {/* 计时器名称 */}
      {timerTitle ? (
        <AnimatedRegion
          transitionKey="timer-title"
          className="pb-4 landscape:max-md:pb-1.5"
        >
          <motion.h2
            className={`${isFullscreen ? 'text-3xl md:text-4xl landscape:max-md:text-xl' : 'text-xl sm:text-2xl md:text-3xl landscape:max-md:text-lg'} font-medium`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              color: activeTimer.color,
              transition: 'color 0.5s var(--transition-timing)'
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`title:${activeTimer.id}:${activeTimer.type}:${getTimerTitle()}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {getTimerTitle()}
              </motion.span>
            </AnimatePresence>
          </motion.h2>
        </AnimatedRegion>
      ) : null}
      
      {/* 时间显示 */}
      <LayoutGroup id="timer-display-numeric-layout">
      <AutoResizer
        animateWidth={isInitialValuesReady}
        animateHeight={false}
        initial={false}
        overflow="visible"
        className="flex items-center justify-center"
      >
        <CalendarTimeRows
          timeValue={timeValue}
          showYears={showYears}
          showDays={showDays}
          isValueVisible={isInitialValuesReady}
          trend={numberTrend}
          color={activeTimer.color || '#0ea5e9'}
          fontSize={timerFontSize}
          labelFontSize={labelFontSize}
          separatorClassName={separatorClassName}
          labels={timeLabels}
        />
      </AutoResizer>
      </LayoutGroup>
      
      <div className="relative z-20 flex flex-col items-center whitespace-nowrap">
        {/* The lower controls stay in the measured flow so the complete content group remains centered. */}
        <AnimatedRegion
          transitionKey={`controls:${activeTimer.id}:${activeTimer.type === 'stopwatch' ? 'stopwatch' : 'none'}`}
          type="slideUp"
          className="pt-8 landscape:max-md:pt-3"
        >
          {activeTimer.type === 'stopwatch' ? (
            <motion.div
              className="flex space-x-4 relative"
              style={{ zIndex: 40, pointerEvents: 'auto' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AutoTransition
                transitionKey={isRunning ? 'stopwatch-pause-control' : 'stopwatch-play-control'}
                initial={false}
                type="crossFade"
                className="flex items-center justify-center"
              >
                <button
                  onClick={() => handleStopwatchControl(isRunning ? 'pause' : 'play')}
                  className="liquid-glass-control p-4 sm:p-5 rounded-full cursor-pointer select-none active:scale-95 transition-transform"
                  style={{ color: activeTimer.color, zIndex: 41, position: 'relative', pointerEvents: 'auto', userSelect: 'none' }}
                >
                  {isRunning ? <FiPause className="text-xl sm:text-2xl pointer-events-none" /> : <FiPlay className="text-xl sm:text-2xl pointer-events-none" />}
                </button>
              </AutoTransition>
              <button
                onClick={() => handleStopwatchControl('lap')}
                disabled={!isRunning}
                className="liquid-glass-control p-4 sm:p-5 rounded-full cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                style={{ color: activeTimer.color, zIndex: 41, position: 'relative', pointerEvents: 'auto', userSelect: 'none' }}
              >
                <FiFlag className="text-xl sm:text-2xl pointer-events-none" />
              </button>
              <button
                onClick={() => setIsStopwatchStopDialogOpen(true)}
                aria-label={t('controls.stop')}
                className="liquid-glass-control p-4 sm:p-5 rounded-full cursor-pointer select-none active:scale-95 transition-transform"
                style={{ color: activeTimer.color, zIndex: 41, position: 'relative', pointerEvents: 'auto', userSelect: 'none' }}
              >
                <FiSquare className="text-xl sm:text-2xl pointer-events-none" />
              </button>
            </motion.div>
          ) : null}
        </AnimatedRegion>

        <AnimatedRegion
          transitionKey={`finished:${activeTimer.id}:${isFinished && activeTimer.type === 'countdown' ? 'yes' : 'no'}`}
          type="scale"
          className="pt-8 landscape:max-md:pt-3"
        >
          {isFinished && activeTimer.type === 'countdown' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="liquid-glass-control px-6 py-4 rounded-xl flex flex-col items-center gap-3"
            >
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{t('timer.finished')}</p>
              {(activeTimer as CountdownTimer).countdownType === 'short' && (activeTimer as CountdownTimer).durationSeconds ? (
                <button
                  type="button"
                  onClick={() => {
                    const cd = activeTimer as CountdownTimer;
                    const durationSecs = cd.durationSeconds || 60;
                    const newTargetDate = new Date(Date.now() + durationSecs * 1000).toISOString();
                    updateTimer(activeTimer.id, { targetDate: newTargetDate });
                    setIsFinished(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer select-none"
                  style={{ color: activeTimer.color }}
                >
                  <FiRotateCcw className="text-sm" />
                  <span>{t('timer.restart', '重新开始')}</span>
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatedRegion>

        {getTimerDescription() ? (
          <AnimatedRegion
            transitionKey={`description:${activeTimer.id}:${activeTimer.type}:${getTimerDescription()}`}
            className="pt-6 landscape:max-md:pt-2"
          >
            <motion.p
              className="text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {getTimerDescription()}
            </motion.p>
          </AnimatedRegion>
        ) : null}

        <AnimatedRegion
          transitionKey={`laps:${activeTimer.id}:${activeStopwatchTimer?.laps?.length ?? 0}`}
          type="slideUp"
          className="pt-6 landscape:max-md:pt-2"
        >
          {activeStopwatchTimer && activeStopwatchTimer.laps && activeStopwatchTimer.laps.length > 0 ? (
            <motion.button
              className="liquid-glass-control px-6 py-3 rounded-xl cursor-pointer"
              style={{ color: activeTimer.color, zIndex: 10, position: 'relative', pointerEvents: 'auto' }}
              onClick={() => { setIsLapModalOpen(true); track('lap_modal_open'); }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center space-x-2">
                <FiList className="text-xl" />
                <span className="font-medium">{t('lap.title')}</span>
                <span className="text-sm opacity-70">({activeStopwatchTimer.laps.length})</span>
              </div>
            </motion.button>
          ) : null}
        </AnimatedRegion>
      </div>
      </div>
      
      {/* 分段计时弹窗 */}
      <AutoTransition portal transitionKey={isLapModalOpen && activeStopwatchTimer ? 'lap-modal-open' : 'lap-modal-closed'} initial={false} type="fade">
        {isLapModalOpen && activeStopwatchTimer ? (
          <Suspense fallback={null}>
            <LapTimesModal 
              onClose={() => setIsLapModalOpen(false)}
              timerId={activeStopwatchTimer.id}
              laps={activeStopwatchTimer.laps || []}
              timerColor={activeTimer.color}
            />
          </Suspense>
        ) : null}
      </AutoTransition>

      <AutoTransition
        portal
        transitionKey={isStopwatchStopDialogOpen ? 'stopwatch-stop-confirm-open' : 'stopwatch-stop-confirm-closed'}
        initial={false}
        type="fade"
      >
        {isStopwatchStopDialogOpen && activeTimer.type === 'stopwatch' ? (
          <Suspense fallback={null}>
            <StopwatchStopConfirmModal
              title={t('controls.stopConfirmTitle')}
              description={t('controls.stopConfirmDescription')}
              cancelLabel={t('common.cancel')}
              confirmLabel={t('controls.stopConfirmAction')}
              timerColor={activeTimer.color}
              onCancel={() => setIsStopwatchStopDialogOpen(false)}
              onConfirm={() => {
                handleStopwatchControl('stop');
                setIsStopwatchStopDialogOpen(false);
              }}
            />
          </Suspense>
        ) : null}
      </AutoTransition>
      </motion.div>
    </div>
  );
}
