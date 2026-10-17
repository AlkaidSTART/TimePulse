'use client';

import React from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
  type Variant,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';

export type PresetType = 'blur' | 'fade-in-blur' | 'scale' | 'fade' | 'slide';

export type PerType = 'word' | 'char' | 'line';

export type TextEffectProps = {
  children: string;
  per?: PerType;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  onAnimationStart?: () => void;
  segmentWrapperClassName?: string;
  containerTransition?: Transition;
  segmentTransition?: Transition;
  style?: React.CSSProperties;
  mode?: 'popLayout' | 'wait' | 'sync';
};

const defaultStaggerTimes: Record<PerType, number> = {
  char: 0.03,
  word: 0.05,
  line: 0.1,
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
  exit: { opacity: 0 },
};

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(12px)' },
    },
  },
  'fade-in-blur': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 16, filter: 'blur(10px)' },
      visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, y: -10, filter: 'blur(10px)' },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
};

// Check if a segment contains CJK characters or punctuation
const isCjkOrPunctuation = (str: string) =>
  /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(str);

const splitText = (text: string, per: PerType): string[] => {
  if (per === 'line') {
    return text.split('\n');
  }

  // Use Intl.Segmenter for accurate language-aware segmentation (CJK + Latin words/chars)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, {
        granularity: per === 'word' ? 'word' : 'grapheme',
      });
      return Array.from(segmenter.segment(text)).map((s) => s.segment);
    } catch {
      // fallback to regex if Intl.Segmenter fails
    }
  }

  if (per === 'char') {
    return Array.from(text);
  }

  return text.split(/(\s+)/);
};

const AnimationComponent: React.FC<{
  segment: string;
  variants: Variants;
  per: 'line' | 'word' | 'char';
  segmentWrapperClassName?: string;
}> = React.memo(({ segment, variants, per, segmentWrapperClassName }) => {
  if (per === 'line') {
    const lineContent = (
      <motion.span variants={variants} className="block">
        {segment}
      </motion.span>
    );
    if (!segmentWrapperClassName) return lineContent;
    return <span className={cn('block', segmentWrapperClassName)}>{lineContent}</span>;
  }

  if (per === 'word') {
    const isSpaceOnly = /^\s+$/.test(segment);
    const wordContent = (
      <motion.span
        aria-hidden="true"
        variants={variants}
        className={cn(
          'inline-block',
          isSpaceOnly ? 'whitespace-pre' : 'whitespace-nowrap'
        )}
      >
        {segment}
      </motion.span>
    );
    if (!segmentWrapperClassName) return wordContent;
    return <span className={cn('inline-block', segmentWrapperClassName)}>{wordContent}</span>;
  }

  // per === 'char'
  const isSpace = /^\s+$/.test(segment);
  const isCjk = isCjkOrPunctuation(segment);

  const charContent = (
    <motion.span
      aria-hidden="true"
      variants={variants}
      className={cn(
        'inline-block',
        isSpace ? 'whitespace-pre' : isCjk ? 'whitespace-normal' : 'whitespace-pre'
      )}
    >
      {segment}
    </motion.span>
  );

  if (!segmentWrapperClassName) return charContent;
  return <span className={cn('inline-block', segmentWrapperClassName)}>{charContent}</span>;
});

AnimationComponent.displayName = 'AnimationComponent';

const hasTransition = (
  variant?: Variant
): variant is TargetAndTransition & { transition?: Transition } => {
  if (!variant) return false;
  return typeof variant === 'object' && 'transition' in variant;
};

const createVariantsWithTransition = (
  baseVariants: Variants,
  transition?: Transition & { exit?: Transition }
): Variants => {
  if (!transition) return baseVariants;

  const { exit: _, ...mainTransition } = transition;

  return {
    ...baseVariants,
    visible: {
      ...baseVariants.visible,
      transition: {
        ...(hasTransition(baseVariants.visible)
          ? baseVariants.visible.transition
          : {}),
        ...mainTransition,
      },
    },
    exit: {
      ...baseVariants.exit,
      transition: {
        ...(hasTransition(baseVariants.exit)
          ? baseVariants.exit.transition
          : {}),
        ...mainTransition,
        staggerDirection: -1,
      },
    },
  };
};

export function TextEffect({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset = 'fade',
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
  mode = 'popLayout',
}: TextEffectProps) {
  const shouldReduceMotion = useReducedMotion();
  const segments = React.useMemo(() => splitText(children, per), [children, per]);
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  const baseVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };

  const stagger = shouldReduceMotion ? 0 : defaultStaggerTimes[per] / speedReveal;
  const baseDuration = shouldReduceMotion ? 0.01 : 0.3 / speedSegment;

  const customStagger = hasTransition(variants?.container?.visible ?? {})
    ? (variants?.container?.visible as TargetAndTransition).transition?.staggerChildren
    : undefined;

  const customDelay = hasTransition(variants?.container?.visible ?? {})
    ? (variants?.container?.visible as TargetAndTransition).transition?.delayChildren
    : undefined;

  const computedVariants = React.useMemo(
    () => ({
      container: createVariantsWithTransition(
        variants?.container || baseVariants.container,
        {
          staggerChildren: customStagger ?? stagger,
          delayChildren: customDelay ?? delay,
          ...containerTransition,
          exit: {
            staggerChildren: (customStagger ?? stagger) * 0.5,
            staggerDirection: -1,
          },
        }
      ),
      item: createVariantsWithTransition(variants?.item || baseVariants.item, {
        duration: baseDuration,
        ...segmentTransition,
      }),
    }),
    [
      variants,
      baseVariants,
      customStagger,
      stagger,
      customDelay,
      delay,
      containerTransition,
      baseDuration,
      segmentTransition,
    ]
  );

  return (
    <AnimatePresence mode={mode}>
      {trigger && (
        <MotionTag
          key={children}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={computedVariants.container}
          className={className}
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={style}
        >
          {per !== 'line' ? <span className="sr-only">{children}</span> : null}
          {segments.map((segment, index) => (
            <AnimationComponent
              key={`${per}-${index}-${segment}`}
              segment={segment}
              variants={computedVariants.item}
              per={per}
              segmentWrapperClassName={segmentWrapperClassName}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}

export default TextEffect;
