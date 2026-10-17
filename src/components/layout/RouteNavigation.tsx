import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiCheckSquare } from 'react-icons/fi';
import { usePageTransition, type PageView } from '@/hooks/usePageTransition';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTranslation } from '@/i18n/useTranslation';
import { readTodoItems, TODO_STORAGE_EVENT } from '@/features/todo/todoStorage';

type RouteNavigationProps = {
  compact?: boolean;
  className?: string;
};

type RouteItem = {
  id: PageView;
  label: string;
  shortLabel: string;
  icon: typeof FiClock;
  title: string;
  description: string;
};

export default function RouteNavigation({ compact = false, className = '' }: RouteNavigationProps) {
  const { view, transitionTo } = usePageTransition();
  const { accentColor } = useTheme();
  const { timers, activeTimerId } = useTimers();
  const { t } = useTranslation();
  const [hoveredRoute, setHoveredRoute] = useState<PageView | null>(null);
  const [pendingTodoCount, setPendingTodoCount] = useState(0);
  const [firstPendingText, setFirstPendingText] = useState('');

  // Sync uncompleted todo count & first pending item
  useEffect(() => {
    const updateCount = () => {
      try {
        const items = readTodoItems();
        const pending = items.filter((item) => !item.completed);
        setPendingTodoCount(pending.length);
        setFirstPendingText(pending[0]?.text || '');
      } catch {
        // storage fallback
      }
    };
    updateCount();
    window.addEventListener(TODO_STORAGE_EVENT, updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener(TODO_STORAGE_EVENT, updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const activeTimer = timers.find((timer) => timer.id === activeTimerId) || timers[0];

  const routes: RouteItem[] = [
    {
      id: 'main',
      label: t('header.timers', '计时器'),
      shortLabel: '计时',
      icon: FiClock,
      title: '计时器与时钟',
      description: '时钟、倒计时、正计时与世界时区',
    },
    {
      id: 'todo',
      label: t('header.todoTab', '待办清单'),
      shortLabel: '待办',
      icon: FiCheckSquare,
      title: '待办与核对清单',
      description: '每日待办事项与任务打卡清单',
    },
  ];

  return (
    <div className="relative inline-flex flex-col items-center">
      <nav
        aria-label="页面路由导航"
        role="tablist"
        className={`relative inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/50 p-1 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/15 dark:bg-black/40 dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.5)] ${className}`}
      >
        {routes.map((route) => {
          const isActive = view === route.id;
          const isHovered = hoveredRoute === route.id;
          const Icon = route.icon;
          const labelText = compact ? route.shortLabel : route.label;

          return (
            <motion.button
              key={route.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              title={
                isActive
                  ? `${route.title}（正在此页面）`
                  : `切换至 ${route.title} - ${route.description}`
              }
              onClick={() => {
                if (view !== route.id) {
                  transitionTo(route.id);
                }
              }}
              onMouseEnter={() => setHoveredRoute(route.id)}
              onMouseLeave={() => setHoveredRoute(null)}
              whileHover={{ y: -0.5 }}
              whileTap={{ scale: 0.94 }}
              style={
                isActive
                  ? {
                      backgroundColor: accentColor || '#0ea5e9',
                      boxShadow: `0 2px 10px color-mix(in srgb, ${accentColor || '#0ea5e9'} 45%, transparent)`,
                    }
                  : undefined
              }
              className={`group relative flex items-center justify-center gap-1.5 rounded-full select-none cursor-pointer outline-none transition-all duration-200 ${
                compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
              } ${
                isActive
                  ? 'text-white font-semibold shadow-sm'
                  : 'text-gray-700 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white font-medium bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
              }`}
              data-insightflare-event={route.id === 'todo' ? 'todo_route_toggle' : 'timer_route_toggle'}
            >
              {/* Hover Gliding Pill across routes */}
              {isHovered && !isActive && (
                <motion.span
                  layoutId="route-nav-hover-pill"
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-full bg-black/6 dark:bg-white/12 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}

              {/* Active Route Pill Slider */}
              {isActive && (
                <motion.div
                  layoutId="route-nav-active-pill"
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    backgroundColor: accentColor || '#0ea5e9',
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                >
                  {/* Specular glass reflection */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/30" />
                </motion.div>
              )}

              {/* Icon with animated spring bounce/tilt on hover */}
              <motion.span
                className="relative z-10 flex shrink-0 items-center justify-center"
                animate={
                  isHovered && !isActive
                    ? { scale: 1.18, rotate: route.id === 'todo' ? -6 : 6 }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <Icon
                  className={`transition-colors duration-150 ${
                    compact ? 'size-3' : 'size-3.5'
                  } ${
                    isActive
                      ? 'text-white stroke-[2.3]'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white stroke-[1.8]'
                  }`}
                />
              </motion.span>

              {/* Route Label */}
              <span
                className={`relative z-10 tracking-tight transition-colors duration-150 whitespace-nowrap ${
                  isActive
                    ? 'font-semibold text-white'
                    : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white'
                }`}
              >
                {labelText}
              </span>

              {/* Todo Pending Badge if count > 0 */}
              {route.id === 'todo' && pendingTodoCount > 0 && !compact && (
                <span
                  className={`relative z-10 ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-primary-500/15 text-primary-600 dark:text-primary-300'
                  }`}
                  title={`${pendingTodoCount} 个待办事项待完成`}
                >
                  {pendingTodoCount}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Hover Floating Preview Card: 详细显示其他路由是什么东西及当前停留路由 */}
      <AnimatePresence>
        {hoveredRoute && !compact && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-full mt-2 w-72 rounded-2xl border border-white/40 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/95 z-50 pointer-events-none text-left"
            style={{
              left: hoveredRoute === 'main' ? '25%' : '75%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Header with icon, label, and current staying status */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200/50 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  {hoveredRoute === 'main' ? <FiClock className="size-3.5" /> : <FiCheckSquare className="size-3.5" />}
                </span>
                <span className="font-bold text-xs text-gray-900 dark:text-white">
                  {hoveredRoute === 'main' ? '计时器路由' : '待办清单路由'}
                </span>
              </div>
              {/* Badge showing if currently staying on this route */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  view === hoveredRoute
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}
              >
                {view === hoveredRoute ? '正在此页' : '点击前往'}
              </span>
            </div>

            {/* Body showing what is inside this route */}
            <div className="pt-2 text-[11px] space-y-1">
              {hoveredRoute === 'main' ? (
                <>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    时钟、倒计时、正计时与世界时区
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 truncate">
                    活动计时: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeTimer?.name || '本地时间'}</span>
                    <span className="ml-1 text-[10px] text-gray-400">（共 {timers.length} 个计时器）</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    今日待办清单与任务专注核对
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 truncate">
                    {pendingTodoCount > 0 ? (
                      <>
                        待办状态: <span className="font-semibold text-primary-600 dark:text-primary-400">{pendingTodoCount} 项未完成</span>
                        {firstPendingText ? ` · 下一项: "${firstPendingText}"` : ''}
                      </>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">所有事项均已完成</span>
                    )}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
