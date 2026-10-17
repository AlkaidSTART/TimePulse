import { motion, useReducedMotion } from 'framer-motion';

export interface TimerSkeletonProps {
  columns?: number;
  showTitle?: boolean;
  className?: string;
}

export default function TimerSkeleton({
  columns = 3,
  showTitle = false,
  className = '',
}: TimerSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardList = Array.from({ length: Math.max(1, columns) }, (_, i) => i);

  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${className}`}
      role="status"
      aria-label="正在加载时间"
      data-testid="timer-skeleton"
    >
      {/* 标题骨架条（与真实标题高度和间距一致） */}
      {showTitle && (
        <div className="pb-4">
          <div className="h-6 sm:h-7 md:h-8 w-28 sm:w-36 md:w-44 rounded-full bg-slate-200/80 dark:bg-white/10 animate-pulse" />
        </div>
      )}

      {/* 数字卡片骨架行 */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4">
        {cardList.map((index) => (
          <div key={index} className="flex items-center space-x-2 sm:space-x-4">
            {index > 0 && (
              <span
                className="relative font-thin text-slate-300 dark:text-slate-600 select-none text-4xl sm:text-5xl md:text-6xl -translate-y-3 opacity-60"
                aria-hidden="true"
              >
                :
              </span>
            )}

            <div className="flex flex-col items-center">
              {/* 液态磨砂卡片（尺寸与 DigitColumn 1:1 对齐） */}
              <div className="w-20 sm:w-24 md:w-32 h-24 sm:h-32 md:h-36 rounded-2xl liquid-glass-digit flex items-center justify-center relative overflow-hidden">
                {/* 顶部高光细边线 */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent"
                  aria-hidden="true"
                />

                {/* 数字双占位块（模拟两位数展示） */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 relative z-10 opacity-75">
                  <div className="w-5 sm:w-6 md:w-8 h-10 sm:h-12 md:h-14 rounded-lg bg-slate-300/70 dark:bg-white/15" />
                  <div className="w-5 sm:w-6 md:w-8 h-10 sm:h-12 md:h-14 rounded-lg bg-slate-300/70 dark:bg-white/15" />
                </div>

                {/* 极简骨架屏微光流影 (Shimmer Wave) */}
                {!shouldReduceMotion && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.08] to-transparent"
                    animate={{ transform: ['translateX(-100%)', 'translateX(100%)'] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.15,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* 底部时间单位标签骨架条 (时 / 分 / 秒 等) */}
              <div className="h-5 sm:h-6 flex items-center justify-center mt-1 sm:mt-1.5">
                <div className="w-8 sm:w-10 h-3 sm:h-3.5 rounded-full bg-slate-200/70 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
