import React, { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import { cn } from './utils';

export type SubmitButtonStatus = 'idle' | 'loading' | 'success' | 'error';
export type LoadingAnimationType =
  | 'wave-dots'
  | 'spinner'
  | 'orbit'
  | 'ripple'
  | 'pulse-bars';

export interface ProgressSubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 按钮当前所处的提交状态 */
  status?: SubmitButtonStatus;
  /** 主题或高亮强调色（默认跟随全局主题色） */
  accentColor?: string;
  /** 兼容旧属性：强调色 */
  progressColor?: string;
  /** 加载中动效样式（默认 'wave-dots' 灵动波浪三点，亦支持 'spinner' 极简圆环、'orbit' 星轨、'ripple' 呼吸涟漪或 'pulse-bars' 律动柱） */
  loadingAnimation?: LoadingAnimationType;
  /** 空闲/初始状态下的文字 */
  idleText?: React.ReactNode;
  /** 提交中/加载中的文字 */
  loadingText?: React.ReactNode;
  /** 成功状态下的文字 */
  successText?: React.ReactNode;
  /** 空闲状态下的后缀图标（如向右箭头） */
  icon?: React.ReactNode;
  /** 成功状态下的展示图标（默认对勾） */
  successIcon?: React.ReactNode;
  /** 可选进度 (0 - 100)，提供时在底部渲染极细微质感进度线 */
  progress?: number;
  /** 成功动画播放完成后的回调 (单位毫秒由 successDuration 决定) */
  onSuccessComplete?: () => void;
  /** 成功状态维持时间（毫秒，默认 1100ms） */
  successDuration?: number;
  /** 根按钮附加 className */
  className?: string;
}

/**
 * 将 hex 颜色转换为 rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length >= 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export const ProgressSubmitButton = React.forwardRef<HTMLButtonElement, ProgressSubmitButtonProps>(
  (
    {
      status = 'idle',
      accentColor,
      progressColor,
      loadingAnimation = 'wave-dots',
      idleText = '立即提交',
      loadingText = '正在安全验证...',
      successText = '提交成功',
      icon,
      successIcon,
      progress,
      onSuccessComplete,
      successDuration = 1100,
      className,
      disabled,
      type = 'submit',
      ...buttonProps
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const buttonRef = (forwardedRef as React.RefObject<HTMLButtonElement>) || internalRef;
    const shouldReduceMotion = useReducedMotion();

    // 安全解析主题色：优先 accentColor，其次 progressColor，默认 TimePulse 品牌翠绿 #10A37F
    const safeAccent = useMemo(() => {
      if (accentColor && /^#[0-9A-Fa-f]{3,8}$/.test(accentColor)) {
        return accentColor;
      }
      if (progressColor && /^#[0-9A-Fa-f]{3,8}$/.test(progressColor)) {
        return progressColor;
      }
      return '#10A37F';
    }, [accentColor, progressColor]);

    const isSuccess = status === 'success';
    const isLoading = status === 'loading';
    const isError = status === 'error';

    // 成功回调计时器
    useEffect(() => {
      if (status === 'success') {
        const timer = setTimeout(() => {
          onSuccessComplete?.();
        }, successDuration);
        return () => clearTimeout(timer);
      }
    }, [status, successDuration, onSuccessComplete]);

    return (
      <motion.button
        ref={buttonRef}
        type={type}
        disabled={disabled || isLoading || isSuccess}
        animate={
          isError
            ? {
                x: [-5, 5, -3, 3, -1, 1, 0],
                transition: { duration: 0.38, ease: 'easeInOut' },
              }
            : undefined
        }
        whileHover={
          !disabled && !isLoading && !isSuccess
            ? {
                scale: 1.006,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        whileTap={
          !disabled && !isLoading && !isSuccess
            ? {
                scale: 0.985,
              }
            : undefined
        }
        className={cn(
          'relative w-full rounded-2xl select-none group focus:outline-none transition-all duration-300 overflow-hidden cursor-pointer',
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
          className
        )}
        style={{
          backgroundColor: isSuccess
            ? hexToRgba(safeAccent, 0.2)
            : isLoading
            ? hexToRgba(safeAccent, 0.12)
            : hexToRgba(safeAccent, 0.08),
          borderColor: isSuccess
            ? hexToRgba(safeAccent, 0.45)
            : isLoading
            ? hexToRgba(safeAccent, 0.35)
            : hexToRgba(safeAccent, 0.22),
          borderWidth: 1,
          borderStyle: 'solid',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isSuccess
            ? `0 10px 28px -4px ${hexToRgba(safeAccent, 0.28)}, inset 0 1px 1px rgba(255, 255, 255, 0.5)`
            : isLoading
            ? `0 6px 20px -2px ${hexToRgba(safeAccent, 0.2)}, inset 0 1px 1px rgba(255, 255, 255, 0.35)`
            : `0 4px 16px -2px ${hexToRgba(safeAccent, 0.1)}, inset 0 1px 1px rgba(255, 255, 255, 0.35)`,
          color: safeAccent,
        }}
        {...(buttonProps as any)}
      >
        {/* 1. 悬停微光浮层 */}
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            backgroundColor: hexToRgba(safeAccent, 0.06),
          }}
        />

        {/* 2. Loading 状态下的轻盈毛玻璃呼吸律动 */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            animate={
              shouldReduceMotion
                ? { opacity: 0.35 }
                : {
                    opacity: [0.15, 0.42, 0.15],
                    scale: [0.99, 1.01, 0.99],
                  }
            }
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: `radial-gradient(circle at center, ${hexToRgba(safeAccent, 0.3)} 0%, transparent 75%)`,
            }}
          />
        )}

        {/* 3. 成功瞬间的温润柔和扩散微光 */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{ opacity: 0, scale: 1.05 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                backgroundColor: hexToRgba(safeAccent, 0.25),
              }}
            />
          )}
        </AnimatePresence>

        {/* 4. 按钮主体文字与图标微动效 */}
        <div className="relative z-10 w-full py-3 sm:py-3.5 px-5 flex items-center justify-center font-semibold text-xs sm:text-sm tracking-wide">
          <RenderButtonContent
            status={status}
            loadingAnimation={loadingAnimation}
            shouldReduceMotion={shouldReduceMotion}
            idleText={idleText}
            loadingText={loadingText}
            successText={successText}
            icon={icon}
            successIcon={successIcon}
          />
        </div>

        {/* 5. 若传入显式进度百分比，则在底部展现 2px 极细微高质感毛玻璃进度细线 */}
        {typeof progress === 'number' && (
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden pointer-events-none">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: safeAccent }}
              animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
        )}
      </motion.button>
    );
  }
);

ProgressSubmitButton.displayName = 'ProgressSubmitButton';

/**
 * 动效方案 1：iOS 灵动呼吸波浪三点（Fluid Wave Dots - 默认）
 * 模拟 iOS / iMessage 经典呼吸起伏三点动效：
 * - 纯净克制，移除刺眼弥散的模糊发光
 * - 黄金比例 6px 微圆点与 6px 间隙，垂直柔滑起伏与透明度律动
 * - 物理平滑曲线 easeInOut，节奏温润轻盈
 */
function WaveDotsLoader({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 h-5 px-0.5 shrink-0', className)}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={{
            y: [0, -3.5, 0],
            opacity: [0.35, 1, 0.35],
            scale: [0.85, 1.15, 0.85],
          }}
          transition={{
            duration: 0.95,
            repeat: Infinity,
            ease: [0.4, 0, 0.6, 1],
            delay: i * 0.16,
          }}
        />
      ))}
    </span>
  );
}

/**
 * 动效方案 2：极简微光圆环（Spinner Ring - Apple / Linear 风格）
 */
function SpinnerLoader({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center size-4 shrink-0', className)} aria-hidden="true">
      <motion.svg
        className="size-4 animate-spin text-current"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2.75"
        />
        <path
          className="opacity-95"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          d="M12 2a10 10 0 0 1 10 10"
        />
      </motion.svg>
    </span>
  );
}

/**
 * 动效方案 3：灵动星轨光环（TimePulse Orbit）
 */
function OrbitLoader({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center size-4 shrink-0', className)} aria-hidden="true">
      <motion.span
        className="size-1.5 rounded-full bg-current"
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-current border-t-transparent opacity-80"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

/**
 * 动效方案 4：呼吸微光涟漪波（Concentric Pulse Ripple）
 */
function RippleLoader({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center size-4 shrink-0', className)} aria-hidden="true">
      <motion.span
        className="size-1.5 rounded-full bg-current"
        animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-current"
        animate={{ scale: [0.5, 1.3], opacity: [0.55, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-current"
        animate={{ scale: [0.5, 1.3], opacity: [0.55, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.75 }}
      />
    </span>
  );
}

/**
 * 动效方案 5：时光脉搏律动柱（4-bar TimePulse Kinetic Waveform）
 */
function PulseBarsLoader({ className }: { className?: string }) {
  const bars = [
    { minH: 5, maxH: 14, duration: 0.85, delay: 0 },
    { minH: 7, maxH: 18, duration: 0.95, delay: 0.15 },
    { minH: 4, maxH: 13, duration: 0.9, delay: 0.3 },
    { minH: 6, maxH: 16, duration: 1.0, delay: 0.45 },
  ];

  return (
    <span className={cn('inline-flex items-center gap-[3px] h-5 px-0.5 shrink-0', className)} aria-hidden="true">
      {bars.map((bar, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full bg-current"
          animate={{
            height: [`${bar.minH}px`, `${bar.maxH}px`, `${bar.minH}px`],
            opacity: [0.45, 0.95, 0.45],
          }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: bar.delay,
          }}
        />
      ))}
    </span>
  );
}

/**
 * 加载态指示器路由器
 */
function LoadingIndicator({
  animation = 'wave-dots',
  shouldReduceMotion = false,
}: {
  animation?: LoadingAnimationType;
  shouldReduceMotion?: boolean | null;
}) {
  if (shouldReduceMotion) {
    return (
      <span className="inline-flex items-center gap-1.5 h-5 px-0.5 shrink-0" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-current opacity-60"
          />
        ))}
      </span>
    );
  }

  if (animation === 'spinner') {
    return <SpinnerLoader />;
  }

  if (animation === 'orbit') {
    return <OrbitLoader />;
  }

  if (animation === 'ripple') {
    return <RippleLoader />;
  }

  if (animation === 'pulse-bars') {
    return <PulseBarsLoader />;
  }

  return <WaveDotsLoader />;
}

/**
 * 内部状态渲染器：负责在 idle / loading / success 间流畅切换文字与图标
 */
function RenderButtonContent({
  status,
  loadingAnimation,
  shouldReduceMotion,
  idleText,
  loadingText,
  successText,
  icon,
  successIcon,
}: {
  status: SubmitButtonStatus;
  loadingAnimation?: LoadingAnimationType;
  shouldReduceMotion?: boolean | null;
  idleText: React.ReactNode;
  loadingText: React.ReactNode;
  successText: React.ReactNode;
  icon?: React.ReactNode;
  successIcon?: React.ReactNode;
}) {
  if (status === 'success') {
    return (
      <span className="flex items-center justify-center gap-2">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 480, damping: 22 }}
          className="shrink-0"
        >
          {successIcon || <FiCheck className="size-4.5 stroke-[2.8]" />}
        </motion.span>
        <span>{successText}</span>
      </span>
    );
  }

  if (status === 'loading') {
    return (
      <span className="flex items-center justify-center gap-2.5">
        <LoadingIndicator
          animation={loadingAnimation}
          shouldReduceMotion={shouldReduceMotion}
        />
        <motion.span
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {loadingText}
        </motion.span>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-center gap-2 group-hover:gap-2.5 transition-all duration-200">
      <span>{idleText}</span>
      {icon && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">
          {icon}
        </span>
      )}
    </span>
  );
}

export default ProgressSubmitButton;
