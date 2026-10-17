import { motion } from 'framer-motion';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useBackground } from '@/app/providers/BackgroundProvider';
import { AutoTransition } from '@/components/ui';

/**
 * 简洁清新的动态背景 (Clean Minimal Canvas)
 * 纯粹温润的背景基底，完全解耦字体颜色，杜绝光晕或色彩渗透干扰
 * 浅色模式通透澄澈，米白模式温润舒适，无光晕干扰
 */
export default function GradientBackground() {
  const { theme } = useTheme();
  const { backgroundType } = useBackground();

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
            key={`bg-clean-${theme}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              background: theme === 'cream'
                ? 'linear-gradient(175deg, #FAF7F0 0%, #F5F0E6 55%, #EDE7DC 100%)'
                : 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 50%, #F4F5F7 100%)',
            }}
          />
        </div>
      ) : null}
    </AutoTransition>
  );
}
