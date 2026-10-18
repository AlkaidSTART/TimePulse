import { useEffect, useRef, type CSSProperties } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface TimerLoadingBoxProps {
  color?: string;
  className?: string;
}

export default function TimerLoadingBox({ color, className = '' }: TimerLoadingBoxProps) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const element = boxRef.current;
    if (!element || shouldReduceMotion) return undefined;

    const controls = animate(
      element,
      { rotate: 90 },
      { type: 'spring', repeat: Infinity, repeatDelay: 0.2 },
    );

    return () => {
      controls.stop();
    };
  }, [shouldReduceMotion]);

  return (
    <div
      ref={boxRef}
      className={`box ${className}`.trim()}
      style={{
        '--hue-1': color || 'rgb(var(--color-primary))',
        backgroundColor: 'var(--hue-1)',
      } as CSSProperties}
      role="status"
      aria-label={t('common.loading', '加载中')}
      data-testid="timer-loading-box"
    />
  );
}

