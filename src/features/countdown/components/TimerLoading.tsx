import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface TimerLoadingProps {
  color?: string;
  className?: string;
  text?: string;
  dataTestId?: string;
}

/**
 * 极简计时器加载动画组件
 * 优雅的环形时钟轨迹 + 中心微律动脉冲点，轻量、简约且无侵入感
 */
export default function TimerLoading({
  color,
  className = '',
  text,
  dataTestId = 'timer-loading',
}: TimerLoadingProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const activeColor = color || 'rgb(var(--color-primary))';

  return (
    <div
      className={`flex flex-col items-center justify-center select-none py-6 min-h-[140px] ${className}`.trim()}
      role="status"
      aria-label={text || t('common.loadingTime', '正在加载时间')}
      data-testid={dataTestId}
    >
      <div className="relative flex items-center justify-center w-12 h-12">
        {/* 背景微光柔和晕染 */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-20 dark:opacity-30 pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: activeColor }}
          aria-hidden="true"
        />

        {/* 极简环形流光轨道 */}
        <motion.svg
          className="w-11 h-11 relative z-10"
          viewBox="0 0 44 44"
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={{
            duration: 1.15,
            repeat: Infinity,
            ease: 'linear',
          }}
          aria-hidden="true"
        >
          {/* 静止底环 */}
          <circle
            cx="22"
            cy="22"
            r="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="opacity-15 dark:opacity-20 transition-colors duration-300"
            style={{ color: activeColor }}
          />
          {/* 旋转主弧线 */}
          <circle
            cx="22"
            cy="22"
            r="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="26 80"
            className="transition-colors duration-300"
            style={{ color: activeColor }}
          />
        </motion.svg>

        {/* 中心微律动脉冲点 (TimePulse) */}
        <motion.div
          className="absolute w-2 h-2 rounded-full z-20 pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: activeColor }}
          animate={
            shouldReduceMotion
              ? { opacity: 0.8 }
              : {
                  scale: [0.85, 1.25, 0.85],
                  opacity: [0.45, 0.95, 0.45],
                }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      </div>

      {/* 极简提示文本（可选） */}
      {text && (
        <span className="mt-3 text-xs tracking-wider text-slate-400 dark:text-slate-500 font-light">
          {text}
        </span>
      )}
    </div>
  );
}
