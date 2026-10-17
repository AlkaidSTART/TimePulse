import NumberFlow, { NumberFlowElement } from '@number-flow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';

type FontSize = 'small' | 'medium' | 'large';

type DigitColumnProps = {
  value: number;
  label: string;
  color?: string;
  fontSize?: FontSize;
  labelFontSize?: FontSize;
  cycleAtSixty?: boolean;
  trend: -1 | 1;
  isValueVisible: boolean;
};

const sixtyBasedDigits = {
  0: { max: 9 },
  1: { max: 5 },
};

const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-4xl sm:text-5xl md:text-6xl',
  medium: 'text-5xl sm:text-6xl md:text-7xl',
  large: 'text-6xl sm:text-7xl md:text-8xl',
};

const labelFontSizeClasses: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

const labelSlotHeightClasses: Record<FontSize, string> = {
  small: 'h-5',
  medium: 'h-6',
  large: 'h-7',
};

const numberFlowTiming = {
  duration: 580,
  easing: NumberFlowElement.defaultProps.transformTiming.easing,
};

const numberFlowOpacityTiming = {
  duration: 580,
  easing: NumberFlowElement.defaultProps.opacityTiming.easing,
};

function DigitColumn({
  value,
  label,
  color = '#0ea5e9',
  fontSize = 'medium',
  labelFontSize = 'medium',
  cycleAtSixty = false,
  trend,
  isValueVisible,
}: DigitColumnProps) {
  const digitCount = Math.max(2, Math.abs(value).toString().length);
  const widthClass = digitCount >= 3
    ? 'w-24 sm:w-32 md:w-40'
    : 'w-20 sm:w-24 md:w-32';

  return (
    <motion.div
      layout="position"
      transition={{ layout: { type: 'tween', duration: 0.24, ease: 'easeOut' } }}
      className="flex flex-col items-center"
    >
      <motion.div
        className={`${widthClass} h-24 sm:h-32 md:h-36 rounded-2xl liquid-glass-digit flex items-center justify-center relative overflow-hidden`}
        style={{
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform',
        }}
        whileHover={{
          scale: 1.025,
          y: -2,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        {/* 顶部弧形液体高光 (Convex Specular Highlight Arc) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[50%] overflow-hidden rounded-t-[inherit]"
          aria-hidden="true"
        >
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse 95% 100% at 50% 0%, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.16) 55%, transparent 100%)',
            }}
          />
        </div>

        {/* 对角流体光泽 (Diagonal Fluid Sheen) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-35"
          style={{
            background:
              'linear-gradient(120deg, rgba(255, 255, 255, 0.45) 0%, transparent 40%, rgba(255, 255, 255, 0.12) 80%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* 底部表面张力折射弧线 (Bottom Meniscus Refraction Band) */}
        <div
          className="pointer-events-none absolute inset-x-3 bottom-0 h-[1.5px] rounded-full opacity-65"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* 伴随主题色的液体焦散微光 (Fluid Caustic Ambient Glow) */}
        <div
          className="pointer-events-none absolute -bottom-5 inset-x-2 h-12 rounded-full blur-xl opacity-25 group-hover:opacity-45 transition-opacity duration-300"
          style={{
            background: `radial-gradient(ellipse at center, ${color} 0%, transparent 75%)`,
          }}
          aria-hidden="true"
        />

        <NumberFlow
          value={isValueVisible ? value : 0}
          format={{ minimumIntegerDigits: 2, useGrouping: false }}
          locales="en-US"
          transformTiming={numberFlowTiming}
          opacityTiming={numberFlowOpacityTiming}
          digits={cycleAtSixty ? sixtyBasedDigits : undefined}
          trend={trend}
          isolate
          className={`${fontSizeClasses[fontSize]} font-bold [--number-flow-mask-height:0.32em] relative z-10`}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            color,
            transition: 'color 0.5s var(--transition-timing)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 0.85,
            filter: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.4))',
          }}
        />
      </motion.div>

      <div className={`relative mt-2 flex w-full items-center justify-center ${labelSlotHeightClasses[labelFontSize]}`}>
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={label}
            className={`absolute inset-x-0 whitespace-nowrap text-center ${labelFontSizeClasses[labelFontSize]} text-gray-500 dark:text-gray-400`}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            whileHover={{ color }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default memo(DigitColumn);
