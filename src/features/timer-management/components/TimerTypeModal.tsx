import { motion } from 'framer-motion';
import { FiX, FiClock, FiPlayCircle, FiGlobe, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { TimerType } from '@/domain/timer';

type TimerTypeModalProps = {
  onClose: () => void;
  onSelectType: (type: TimerType) => void;
  embedded?: boolean;
};

export default function TimerTypeModal({ onClose, onSelectType, embedded = false }: TimerTypeModalProps) {
  const { t } = useTranslation();

  const timerTypes = [
    {
      id: 'countdown' as const,
      name: t('timer.countdown', '倒计时'),
      tag: t('timer.countdownTag', '倒数'),
      description: t('timer.countdownDesc', '设置目标时间，倒数到零'),
      icon: FiClock,
      iconBg: 'bg-gradient-to-br from-rose-500/15 via-rose-500/10 to-orange-500/10 dark:from-rose-500/25 dark:via-rose-500/15 dark:to-orange-500/15',
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconRing: 'ring-1 ring-inset ring-rose-500/20 dark:ring-rose-400/30',
      iconShadow: 'shadow-[0_2px_10px_rgba(244,63,94,0.16)]',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 cream:bg-rose-500/15 cream:text-rose-700',
      hoverBorder: 'hover:border-rose-400/50 dark:hover:border-rose-400/40 cream:hover:border-rose-400/60',
      hoverBg: 'hover:bg-gradient-to-r hover:from-rose-500/[0.06] hover:via-white/80 hover:to-orange-500/[0.03] dark:hover:from-rose-500/[0.12] dark:hover:via-white/[0.05] dark:hover:to-orange-500/[0.04] cream:hover:from-rose-500/[0.08] cream:hover:via-[#fffdf9] cream:hover:to-orange-500/[0.04]',
      hoverShadow: 'hover:shadow-[0_12px_28px_-6px_rgba(244,63,94,0.18),0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_12px_28px_-6px_rgba(244,63,94,0.25)] cream:hover:shadow-[0_12px_28px_-6px_rgba(225,29,72,0.14)]',
    },
    {
      id: 'stopwatch' as const,
      name: t('timer.stopwatch', '正计时器'),
      tag: t('timer.stopwatchTag', '秒表'),
      description: t('timer.stopwatchDesc', '从零开始计时，记录经过时间'),
      icon: FiPlayCircle,
      iconBg: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-teal-500/10 dark:from-emerald-500/25 dark:via-emerald-500/15 dark:to-teal-500/15',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      iconRing: 'ring-1 ring-inset ring-emerald-500/20 dark:ring-emerald-400/30',
      iconShadow: 'shadow-[0_2px_10px_rgba(16,185,129,0.16)]',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 cream:bg-emerald-500/15 cream:text-emerald-700',
      hoverBorder: 'hover:border-emerald-400/50 dark:hover:border-emerald-400/40 cream:hover:border-emerald-400/60',
      hoverBg: 'hover:bg-gradient-to-r hover:from-emerald-500/[0.06] hover:via-white/80 hover:to-teal-500/[0.03] dark:hover:from-emerald-500/[0.12] dark:hover:via-white/[0.05] dark:hover:to-teal-500/[0.04] cream:hover:from-emerald-500/[0.08] cream:hover:via-[#fffdf9] cream:hover:to-teal-500/[0.04]',
      hoverShadow: 'hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.18),0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.25)] cream:hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.14)]',
    },
    {
      id: 'worldclock' as const,
      name: t('timer.worldClock', '世界时间'),
      tag: t('timer.worldClockTag', '时区'),
      description: t('timer.worldClockDesc', '显示不同时区的当前时间'),
      icon: FiGlobe,
      iconBg: 'bg-gradient-to-br from-sky-500/15 via-sky-500/10 to-indigo-500/10 dark:from-sky-500/25 dark:via-sky-500/15 dark:to-indigo-500/15',
      iconColor: 'text-sky-500 dark:text-sky-400',
      iconRing: 'ring-1 ring-inset ring-sky-500/20 dark:ring-sky-400/30',
      iconShadow: 'shadow-[0_2px_10px_rgba(14,165,233,0.16)]',
      badgeBg: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 cream:bg-sky-500/15 cream:text-sky-700',
      hoverBorder: 'hover:border-sky-400/50 dark:hover:border-sky-400/40 cream:hover:border-sky-400/60',
      hoverBg: 'hover:bg-gradient-to-r hover:from-sky-500/[0.06] hover:via-white/80 hover:to-indigo-500/[0.03] dark:hover:from-sky-500/[0.12] dark:hover:via-white/[0.05] dark:hover:to-indigo-500/[0.04] cream:hover:from-sky-500/[0.08] cream:hover:via-[#fffdf9] cream:hover:to-indigo-500/[0.04]',
      hoverShadow: 'hover:shadow-[0_12px_28px_-6px_rgba(14,165,233,0.18),0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_12px_28px_-6px_rgba(14,165,233,0.25)] cream:hover:shadow-[0_12px_28px_-6px_rgba(14,165,233,0.14)]',
    },
  ];

  const cardBaseClass =
    'group relative w-full rounded-2xl p-4 sm:p-4.5 text-left transition-all duration-200 ease-out ' +
    'bg-white/70 hover:bg-white/95 ' +
    'dark:bg-white/[0.04] dark:hover:bg-white/[0.08] ' +
    'cream:bg-[#faf7ee]/85 cream:hover:bg-[#fffdf9]/95 ' +
    'border border-black/[0.06] dark:border-white/[0.08] cream:border-stone-300/60 ' +
    'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] ' +
    'dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.06)] ' +
    'cream:shadow-[0_2px_8px_-2px_rgba(120,95,65,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)] ' +
    'backdrop-blur-xl ' +
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer overflow-hidden';

  const content = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 cream:text-[#2c2825]">
            {t('timer.selectType', '选择计时器类型')}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 cream:text-stone-500">
            {t('timer.selectTypeDesc', '选择适合当前场景的计时模式')}
          </p>
        </div>
        <button
          type="button"
          className="size-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cream:text-stone-400 cream:hover:text-stone-700 bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] cream:bg-stone-300/30 cream:hover:bg-stone-300/50 border border-black/[0.04] dark:border-white/[0.08] cream:border-stone-400/30 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ml-3"
          onClick={onClose}
          aria-label={t('common.close', '关闭')}
        >
          <FiX className="text-lg" />
        </button>
      </div>

      {/* Timer Type Cards */}
      <div className="space-y-3">
        {timerTypes.map((type, index) => {
          const IconComponent = type.icon;
          return (
            <motion.button
              type="button"
              key={type.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className={cn(
                cardBaseClass,
                type.hoverBorder,
                type.hoverBg,
                type.hoverShadow
              )}
              onClick={() => onSelectType(type.id)}
              data-insightflare-event="timer_type_select"
              data-insightflare-event-type={type.id}
            >
              <div className="flex items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Icon Badge */}
                  <div
                    className={cn(
                      'size-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ease-out group-hover:scale-105',
                      type.iconBg,
                      type.iconColor,
                      type.iconRing,
                      type.iconShadow
                    )}
                  >
                    <IconComponent className="text-2xl" />
                  </div>

                  {/* Title & Description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 cream:text-[#2c2825] tracking-tight group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                        {type.name}
                      </h3>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full select-none tracking-wide transition-colors',
                          type.badgeBg
                        )}
                      >
                        {type.tag}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 cream:text-stone-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mt-0.5 line-clamp-1">
                      {type.description}
                    </p>
                  </div>
                </div>

                {/* Right Arrow Pill */}
                <div className="size-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 cream:text-stone-400 group-hover:text-slate-800 dark:group-hover:text-white cream:group-hover:text-stone-800 group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.08] cream:group-hover:bg-stone-400/20 group-hover:translate-x-0.5 transition-all duration-200 shrink-0">
                  <FiChevronRight className="text-lg" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="pt-5 flex items-center justify-end">
        <button
          type="button"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cream:text-stone-600 cream:hover:text-stone-900 bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] cream:bg-stone-300/30 cream:hover:bg-stone-300/50 border border-black/[0.06] dark:border-white/[0.08] cream:border-stone-400/40 shadow-xs backdrop-blur-md transition-all duration-150 active:scale-[0.98] cursor-pointer text-center"
          onClick={onClose}
        >
          {t('common.cancel', '取消')}
        </button>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm overflow-x-hidden overflow-y-auto py-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="glass-card w-full max-w-md m-4 p-6 rounded-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
