import { useState, useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const LETTERS = ['T', 'i', 'm', 'e', 'P', 'u', 'l', 's', 'e'] as const;

type AnimatedLogoProps = {
  /** Logo 颜色，默认为活力暖橙 (#f97316) */
  color?: string;
  /** 兼容旧的 accentColor 属性名 */
  accentColor?: string;
  size?: 'md' | 'lg';
  className?: string;
  onClick?: (e: ReactMouseEvent<HTMLHeadingElement>) => void;
  onLinkClick?: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
};

export default function AnimatedLogo({
  color,
  accentColor,
  size = 'lg',
  className = '',
  onClick,
  onLinkClick,
}: AnimatedLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const [waveKey, setWaveKey] = useState(0);
  const isHoveredRef = useRef(false);

  // 优先使用传入的 color 或 accentColor，默认使用高品质橙色
  const effectiveColor = color ?? accentColor ?? '#f97316';
  const isOrange = effectiveColor.toLowerCase() === '#f97316' || effectiveColor.toLowerCase() === 'orange';
  const gradientImage = isOrange
    ? 'linear-gradient(45deg, #f97316, #fb923c)'
    : `linear-gradient(45deg, ${effectiveColor}, color-mix(in srgb, ${effectiveColor} 40%, transparent))`;

  // Periodic ambient pulse (subtle wave every ~8s when user is not actively hovering)
  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      if (!isHoveredRef.current) {
        setWaveKey((k) => k + 1);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const triggerWave = () => {
    if (shouldReduceMotion) return;
    setWaveKey((k) => k + 1);
  };

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    triggerWave();
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
  };

  const sizeClass = size === 'md' ? 'text-lg' : 'text-xl';

  return (
    <h1
      aria-label="TimePulse"
      className={`font-bold font-display select-none cursor-pointer inline-flex items-center ${sizeClass} ${className}`}
      style={{ '--logo-accent': effectiveColor } as CSSProperties}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href="https://time-pulse-two.vercel.app/"
        aria-label="TimePulse"
        className="inline-flex items-center focus-visible:outline-none"
        onClick={onLinkClick}
      >
        {LETTERS.map((char, index) => {
          const charStyle: CSSProperties = {
            '--logo-accent': effectiveColor,
            backgroundImage: gradientImage,
          } as CSSProperties;

          if (shouldReduceMotion) {
            return (
              <span
                key={index}
                aria-hidden="true"
                className="logo-gradient inline-block bg-clip-text text-transparent"
                style={charStyle}
              >
                {char}
              </span>
            );
          }

          const tilt = index % 2 === 0 ? -3 : 3;

          return (
            <motion.span
              key={`${index}-${waveKey}`}
              aria-hidden="true"
              className="logo-gradient inline-block bg-clip-text text-transparent origin-bottom cursor-pointer will-change-transform"
              style={charStyle}
              initial={waveKey === 0 ? { opacity: 0, y: 7, scale: 0.92 } : false}
              animate={{
                opacity: 1,
                y: waveKey === 0 ? 0 : [0, -5, 0],
                scale: 1,
              }}
              transition={{
                duration: waveKey === 0 ? 0.38 : 0.45,
                delay: index * 0.035,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              whileHover={{
                y: -5.5,
                scale: 1.22,
                rotate: tilt,
                transition: {
                  type: 'spring',
                  stiffness: 450,
                  damping: 10,
                },
              }}
              whileTap={{ scale: 0.92 }}
            >
              {char}
            </motion.span>
          );
        })}
      </a>
    </h1>
  );
}
