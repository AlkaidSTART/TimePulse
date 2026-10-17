import { useEffect, useRef, type CSSProperties } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from 'framer-motion';

export interface TimerLoadingBoxProps {
  color?: string;
  className?: string;
}

export default function TimerLoadingBox({ color, className = '' }: TimerLoadingBoxProps) {
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
      aria-label="加载中"
      data-testid="timer-loading-box"
    />
  );
}
