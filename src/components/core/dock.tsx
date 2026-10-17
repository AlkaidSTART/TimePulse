import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import React, {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  Component,
  HomeIcon,
  Mail,
  Package,
  ScrollText,
  SunMoon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOCK_HEIGHT = 128;
const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 64;

export type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

export type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  badge?: React.ReactNode;
};

export type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};

export type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

export type DockBadgeProps = {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: unknown;
};

export type DocContextType = {
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  magnification: number;
  distance: number;
};

export type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

interface DockItemContextType {
  width: MotionValue<number>;
  isHovered: MotionValue<number>;
}

const DockItemContext = createContext<DockItemContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
}

export function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4);
  }, [magnification]);

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={{
        height,
        scrollbarWidth: 'none',
      }}
      className="mx-2 flex max-w-full items-end overflow-visible select-none"
    >
      <motion.div
        onMouseMove={(e) => {
          isHovered.set(1);
          mouseX.set(e.clientX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={cn(
          'mx-auto flex w-fit gap-3 rounded-2xl border border-black/[0.08] bg-white/70 px-3.5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/80',
          className
        )}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        <DockProvider value={{ mouseX, spring, distance, magnification }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

export function DockItem({
  children,
  className,
  onClick,
  isActive = false,
  tabIndex = 0,
  role = 'button',
  'aria-label': ariaLabel,
  badge,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, magnification, mouseX, spring } = useDock();
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - domRect.x - domRect.width / 2;
  });

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(widthTransform, spring);

  return (
    <DockItemContext.Provider value={{ width, isHovered }}>
      <motion.div
        ref={ref}
        style={{ width }}
        onHoverStart={() => isHovered.set(1)}
        onHoverEnd={() => isHovered.set(0)}
        onFocus={() => isHovered.set(1)}
        onBlur={() => isHovered.set(0)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cn(
          'relative inline-flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          className
        )}
        tabIndex={tabIndex}
        role={role}
        aria-haspopup="true"
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {Children.map(children, (child) =>
          React.isValidElement(child)
            ? cloneElement(child as React.ReactElement<Record<string, unknown>>, { width, isHovered })
            : child
        )}

        {/* macOS Style Notification Badge - positioned on top-right of dock tile, outside the icon */}
        {badge}

        {/* macOS Style Running Indicator Dot */}
        {isActive && (
          <span
            className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-current opacity-85 shadow-xs"
            aria-hidden="true"
          />
        )}
      </motion.div>
    </DockItemContext.Provider>
  );
}

export function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const context = useContext(DockItemContext);
  const isHovered = (restProps['isHovered'] as MotionValue<number> | undefined) || context?.isHovered;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.92 }}
          animate={{ opacity: 1, y: -10, scale: 1 }}
          exit={{ opacity: 0, y: 0, scale: 0.92 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'pointer-events-none absolute -top-7 left-1/2 z-50 w-fit whitespace-nowrap rounded-lg border border-black/10 bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-neutral-900/95 dark:text-neutral-100',
            className
          )}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const context = useContext(DockItemContext);
  const widthProp = (restProps['width'] as MotionValue<number> | undefined) || context?.width;
  const fallbackWidth = useMotionValue(40);
  const width = widthProp || fallbackWidth;

  const widthTransform = useTransform(width, (val) => val / 2);

  return (
    <motion.div
      style={{ width: widthTransform }}
      className={cn('flex aspect-square items-center justify-center p-0.5', className)}
    >
      {children}
    </motion.div>
  );
}

export function DockBadge({ children, className, style, ...rest }: DockBadgeProps) {
  void rest;
  const context = useContext(DockItemContext);
  let magnification = DEFAULT_MAGNIFICATION;
  try {
    const dockContext = useDock();
    magnification = dockContext.magnification;
  } catch {
    // DockBadge used outside DockProvider
  }

  const fallbackWidth = useMotionValue(40);
  const width = context?.width || fallbackWidth;
  const scale = useTransform(width, [40, magnification], [1, 1.2]);

  if (children === undefined || children === null || children === '') {
    return null;
  }

  return (
    <motion.span
      style={{ scale, originX: 1, originY: 0, ...style }}
      className={cn(
        'pointer-events-none absolute -top-1.5 -right-1.5 z-10 flex min-w-4 h-4 px-1 items-center justify-center rounded-full text-[9px] font-bold leading-none text-white shadow-xs ring-2 ring-white dark:ring-[#141416] cream:ring-[#faf7ee]',
        className
      )}
    >
      {children}
    </motion.span>
  );
}

export interface AppleStyleDockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: React.ReactNode;
}

export const defaultAppleDockData: AppleStyleDockItem[] = [
  {
    title: 'Home',
    icon: (
      <HomeIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Products',
    icon: (
      <Package className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Components',
    icon: (
      <Component className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Activity',
    icon: (
      <Activity className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Change Log',
    icon: (
      <ScrollText className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Email',
    icon: (
      <Mail className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
  {
    title: 'Theme',
    icon: (
      <SunMoon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: '#',
  },
];

export interface AppleStyleDockProps {
  className?: string;
  items?: AppleStyleDockItem[];
  onItemClick?: (item: AppleStyleDockItem, index: number) => void;
}

export function AppleStyleDock({
  className,
  items = defaultAppleDockData,
  onItemClick,
}: AppleStyleDockProps = {}) {
  return (
    <div className={cn('absolute bottom-2 left-1/2 max-w-full -translate-x-1/2 z-40', className)}>
      <Dock className="items-end pb-3">
        {items.map((item, idx) => (
          <DockItem
            key={idx}
            aria-label={item.title}
            className="aspect-square rounded-full bg-gray-200/90 dark:bg-neutral-800/90 hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors"
            isActive={item.isActive}
            badge={item.badge}
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (onItemClick) {
                onItemClick(item, idx);
              } else if (item.href && item.href !== '#') {
                window.location.href = item.href;
              }
            }}
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>{item.icon}</DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
