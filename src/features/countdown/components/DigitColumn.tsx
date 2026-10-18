import NumberFlow, { NumberFlowElement } from '@number-flow/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo, useMemo } from 'react';

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
  small: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl landscape:max-md:text-3xl landscape:max-md:sm:text-4xl',
  medium: 'text-[3.25rem] sm:text-6xl md:text-7xl lg:text-8xl landscape:max-md:text-4xl landscape:max-md:sm:text-5xl',
  large: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl landscape:max-md:text-5xl landscape:max-md:sm:text-6xl',
};

const labelFontSizeClasses: Record<FontSize, string> = {
  small: 'text-sm sm:text-base landscape:max-md:text-xs',
  medium: 'text-base sm:text-lg landscape:max-md:text-xs',
  large: 'text-lg sm:text-xl landscape:max-md:text-sm',
};

const labelSlotHeightClasses: Record<FontSize, string> = {
  small: 'h-5 sm:h-6 landscape:max-md:h-4',
  medium: 'h-6 sm:h-7 landscape:max-md:h-4',
  large: 'h-7 sm:h-8 landscape:max-md:h-5',
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
  const shouldReduceMotion = useReducedMotion();
  const digitCount = Math.max(2, Math.abs(value).toString().length);
  const widthClass = digitCount >= 3
    ? 'w-28 sm:w-36 md:w-44 lg:w-48 landscape:max-md:w-20 landscape:max-md:sm:w-28'
    : 'w-[88px] sm:w-28 md:w-36 lg:w-40 landscape:max-md:w-16 landscape:max-md:sm:w-20';

  const numberFlowTiming = useMemo(() => ({
    duration: shouldReduceMotion ? 0 : 420,
    easing: NumberFlowElement.defaultProps.transformTiming.easing,
  }), [shouldReduceMotion]);

  const numberFlowOpacityTiming = useMemo(() => ({
    duration: shouldReduceMotion ? 0 : 420,
    easing: NumberFlowElement.defaultProps.opacityTiming.easing,
  }), [shouldReduceMotion]);

  return (
    <motion.div
      layout={shouldReduceMotion ? false : 'position'}
      transition={{ layout: { type: 'tween', duration: 0.22, ease: 'easeOut' } }}
      className="flex flex-col items-center"
    >
      <motion.div
        className={`${widthClass} h-28 sm:h-36 md:h-44 lg:h-48 landscape:max-md:h-20 landscape:max-md:sm:h-24 rounded-2xl sm:rounded-3xl liquid-glass-digit flex items-center justify-center relative overflow-hidden`}
        whileHover={shouldReduceMotion ? undefined : {
          scale: 1.025,
          y: -2,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        {/* Top hairline specular highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent"
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
          }}
        />
      </motion.div>

      <div className={`relative mt-2.5 flex w-full items-center justify-center ${labelSlotHeightClasses[labelFontSize]}`}>
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={label}
            className={`absolute inset-x-0 whitespace-nowrap text-center ${labelFontSizeClasses[labelFontSize]} font-medium tracking-wider text-gray-500/90 dark:text-gray-400/90`}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -3 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: 'easeOut' }}
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
