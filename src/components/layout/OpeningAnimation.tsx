import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme, type Theme } from '@/app/providers/ThemeProvider';

const TILE_IDS = [0, 1, 2, 3] as const;
const TILE_HUE_OFFSETS = [-36, -12, 12, 36];
const SHUFFLE_DELAYS_MS = [220, 780];
const EXIT_DELAY_MS = 1380;
const EXIT_DURATION_S = 0.42;
const TILE_TRANSITION = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const };

type TileId = (typeof TILE_IDS)[number];

function rgbToHue(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) return 199;

  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return (hue * 60 + 360) % 360;
}

function buildPalette(accentColor: string, theme: Theme): string[] {
  const match = /^#?([\da-f]{6})$/i.exec(accentColor.trim());
  const hex = match?.[1] ?? '0ea5e9';
  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const baseHue = rgbToHue(red, green, blue);
  const lightness = theme === 'cream' ? [52, 57, 61, 55] : [50, 55, 59, 53];

  return TILE_HUE_OFFSETS.map(
    (offset, index) => `hsl(${Math.round((baseHue + offset + 360) % 360)} 72% ${lightness[index]}%)`,
  );
}

function shuffleTiles(tiles: TileId[]): TileId[] {
  const next = [...tiles];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  const isUnchanged = next.every((tile, index) => tile === tiles[index]);
  return isUnchanged ? [...next.slice(1), next[0]] : next;
}

/**
 * Plays a short branded shuffle over the app on every fresh launch. Click/tap
 * skips it, and it is removed entirely when reduced motion is requested.
 */
export default function OpeningAnimation() {
  const { accentColor, theme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const [order, setOrder] = useState<TileId[]>([...TILE_IDS]);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const palette = useMemo(() => buildPalette(accentColor, theme), [accentColor, theme]);

  const finish = useCallback(() => setIsExiting(true), []);

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsVisible(false);
      return;
    }

    if (isExiting) return;

    const shuffleTimers = SHUFFLE_DELAYS_MS.map((delay) =>
      window.setTimeout(() => setOrder((current) => shuffleTiles(current)), delay),
    );
    const exitTimer = window.setTimeout(finish, EXIT_DELAY_MS);

    return () => {
      shuffleTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(exitTimer);
    };
  }, [finish, isExiting, shouldReduceMotion]);

  useEffect(() => {
    if (!isExiting) return;

    const timer = window.setTimeout(() => setIsVisible(false), EXIT_DURATION_S * 1000 + 80);
    return () => window.clearTimeout(timer);
  }, [isExiting]);

  if (!isVisible || shouldReduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[2000] flex cursor-pointer select-none items-center justify-center overflow-hidden bg-background-light cream:bg-background-cream"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: EXIT_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
      onPointerDown={finish}
    >
      <motion.div
        className="relative flex flex-col items-center gap-7"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={
          isExiting
            ? { opacity: 0, scale: 1.04, filter: 'blur(6px)' }
            : { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: isExiting ? 0.34 : 0.32, ease: [0.4, 0, 0.2, 1] }}
      >
        <ul className="grid grid-cols-2 gap-[10px]" style={{ width: 210 }}>
          {order.map((tile) => (
            <motion.li
              key={tile}
              layout="position"
              transition={TILE_TRANSITION}
              className="h-[100px] w-[100px] rounded-[18px]"
              style={{
                backgroundColor: palette[tile],
                boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.08)',
              }}
            />
          ))}
        </ul>

        <motion.span
          className="logo-gradient bg-clip-text font-display text-sm font-semibold tracking-[0.22em] text-transparent"
          style={{ '--logo-accent': accentColor } as CSSProperties}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: isExiting ? 0 : 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          TimePulse
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
