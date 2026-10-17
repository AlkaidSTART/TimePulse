import { motion } from 'framer-motion';
import { useTimers } from '@/app/providers/TimerProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useBackground } from '@/app/providers/BackgroundProvider';
import { AutoTransition } from '@/components/ui';

/**
 * 简洁清新的动态背景 (Clean Minimal Canvas)
 * 移除强烈的模糊光晕与光斑，采用极简天光微渐变
 * 浅色模式通透澄澈，深色模式深邃纯净，无光晕干扰
 */
export default function GradientBackground() {
  const { getActiveTimer, activeTimerId } = useTimers();
  const { theme } = useTheme();
  const { backgroundType } = useBackground();
  const activeTimer = getActiveTimer();
  const color = activeTimer?.color || '#0ea5e9';

  return (
    <AutoTransition
      transitionKey={backgroundType === 'custom' ? 'gradient-hidden' : 'gradient-visible'}
      initial={false}
      type="crossFade"
      className="fixed inset-0 overflow-hidden z-0 pointer-events-none"
    >
      {backgroundType !== 'custom' ? (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            key={`bg-clean-${activeTimerId || 'default'}-${theme}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              background: theme === 'dark'
                ? `linear-gradient(175deg, #0B0F17 0%, color-mix(in srgb, ${color} 3.5%, #0F172A) 50%, #090D14 100%)`
                : `linear-gradient(175deg, #FAFBFD 0%, color-mix(in srgb, ${color} 4.5%, #F1F5F9) 55%, #EDF2F7 100%)`,
            }}
          />
        </div>
      ) : null}
    </AutoTransition>
  );
}
