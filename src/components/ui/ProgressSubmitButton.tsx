import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import { cn } from './utils';

export type SubmitButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ProgressSubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 按钮当前所处的提交状态 */
  status?: SubmitButtonStatus;
  /** 主题或高亮强调色（默认跟随 progressColor） */
  accentColor?: string;
  /** 进度条填充颜色（默认 #F97316 活力暖橙） */
  progressColor?: string;
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
  /** 手动进度 (0 - 100)，若不传则在 loading 状态下自动平滑模拟真实加载进度 */
  progress?: number;
  /** 成功动画播放完成后的回调 (单位毫秒由 successDuration 决定) */
  onSuccessComplete?: () => void;
  /** 成功状态维持时间（毫秒，默认 1300ms，为双向线条滚动留足绝佳欣赏时间） */
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

/**
 * 调整颜色明度，用于生成鲜艳高光与渐变层次
 */
function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return hex;
  const num = parseInt(
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex,
    16
  );
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export const ProgressSubmitButton = React.forwardRef<HTMLButtonElement, ProgressSubmitButtonProps>(
  (
    {
      status = 'idle',
      accentColor,
      progressColor = '#FB923C',
      idleText = '立即提交',
      loadingText = '正在安全验证...',
      successText = '提交成功',
      icon,
      successIcon,
      progress,
      onSuccessComplete,
      successDuration = 1300,
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
    const filterId = useId().replace(/:/g, '');

    // 安全解析进度条填充色（默认 #FB923C 清新柔杏暖橙）
    const safeProgressColor = useMemo(() => {
      if (progressColor && /^#[0-9A-Fa-f]{3,8}$/.test(progressColor)) {
        return progressColor;
      }
      return '#FB923C';
    }, [progressColor]);

    // 安全的主题/初始强调色解析（默认与 progressColor 保持和谐一致）
    const safeAccent = useMemo(() => {
      if (accentColor && /^#[0-9A-Fa-f]{3,8}$/.test(accentColor)) {
        return accentColor;
      }
      return safeProgressColor;
    }, [accentColor, safeProgressColor]);

    // 采用更明快轻盈的高光与清甜蜜杏过渡，摒弃沉闷的暗褐底色
    const highlightProgress = useMemo(
      () => adjustBrightness(safeProgressColor, 16),
      [safeProgressColor]
    );
    const deepProgress = useMemo(
      () => adjustBrightness(safeProgressColor, -6),
      [safeProgressColor]
    );

    // 按钮实时几何尺寸监听，让 SVG 边框光效与圆角 100% 贴合
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    });

    useEffect(() => {
      const el = buttonRef.current;
      if (!el) return;

      const updateDimensions = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      };

      updateDimensions();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(updateDimensions);
        observer.observe(el);
        return () => observer.disconnect();
      }
    }, [buttonRef]);

    // 内部平滑模拟进度状态（当未传 external progress 时）
    const [simulatedProgress, setSimulatedProgress] = useState(0);

    useEffect(() => {
      if (status === 'idle') {
        setSimulatedProgress(0);
      } else if (status === 'loading') {
        // 第一阶段：点击后瞬间跃迁至 18%，给用户极速响应确认
        setSimulatedProgress(18);

        // 第二阶段：平滑缓动至 82% 左右等待接口响应
        const timer = setInterval(() => {
          setSimulatedProgress((prev) => {
            if (prev < 45) return prev + Math.floor(Math.random() * 7 + 4);
            if (prev < 75) return prev + Math.floor(Math.random() * 4 + 2);
            if (prev < 88) return prev + Math.random() * 1.5 + 0.3;
            return prev;
          });
        }, 110);

        return () => clearInterval(timer);
      } else if (status === 'success') {
        // 成功状态：直冲 100% 满格
        setSimulatedProgress(100);
      } else if (status === 'error') {
        setSimulatedProgress(0);
      }
    }, [status]);

    // 实际采用的百分比 (0 ~ 100)
    const effectiveProgress = useMemo(() => {
      if (status === 'success') return 100;
      if (status === 'idle' || status === 'error') return 0;
      if (typeof progress === 'number') {
        return Math.max(0, Math.min(100, progress));
      }
      return Math.min(92, Math.max(0, simulatedProgress));
    }, [status, progress, simulatedProgress]);

    // 成功回调计时器
    useEffect(() => {
      if (status === 'success') {
        const timer = setTimeout(() => {
          onSuccessComplete?.();
        }, successDuration);
        return () => clearTimeout(timer);
      }
    }, [status, successDuration, onSuccessComplete]);

    // 计算几何周长与顶部中心点偏移，让两条双向滚动光线精准从顶部中央向两侧对称疾驰
    const { strokeInset, rectWidth, rectHeight, startOffset } = useMemo(() => {
      const strokeWidth = 2.5;
      const inset = strokeWidth / 2;
      const r = 16; // 匹配 rounded-2xl

      if (dimensions.width > 0 && dimensions.height > 0) {
        const w = Math.max(0, dimensions.width - strokeWidth);
        const h = Math.max(0, dimensions.height - strokeWidth);
        // 圆角矩形周长 P = 2*(w - 2r + h - 2r) + 2*PI*r
        const perimeter = 2 * (w - 2 * r + h - 2 * r) + 2 * Math.PI * r;
        // 顶部水平线段一半长度为 (w - 2r)/2
        const halfTop = Math.max(0, (w - 2 * r) / 2);
        // 顶部中心距离矩形起点 (inset + r, inset) 在 pathLength(100) 体系下的占比
        const topCenterPercent = perimeter > 0 ? (halfTop / perimeter) * 100 : 20;
        // 减去半个光束长度(12)以使光束居中于顶部
        const offset = -(topCenterPercent - 12);

        return {
          strokeInset: inset,
          rectWidth: w,
          rectHeight: h,
          startOffset: offset,
        };
      }

      // 未测得尺寸时的百分比备选方案
      return {
        strokeInset: 1,
        rectWidth: 'calc(100% - 2px)',
        rectHeight: 'calc(100% - 2px)',
        startOffset: -9,
      };
    }, [dimensions]);

    const isSuccess = status === 'success';
    const isLoading = status === 'loading';
    const isError = status === 'error';

    return (
      <motion.button
        ref={buttonRef}
        type={type}
        disabled={disabled || isLoading || isSuccess}
        animate={
          isError
            ? {
                x: [-7, 7, -5, 5, -2, 2, 0],
                transition: { duration: 0.45, ease: 'easeInOut' },
              }
            : undefined
        }
        whileHover={
          !disabled && !isLoading && !isSuccess
            ? {
                scale: 1.008,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        whileTap={
          !disabled && !isLoading && !isSuccess
            ? {
                scale: 0.99,
              }
            : undefined
        }
        className={cn(
          'relative w-full rounded-2xl select-none group focus:outline-none transition-shadow duration-300',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
          className
        )}
        style={{
          boxShadow: isSuccess
            ? `0 10px 32px -4px ${hexToRgba(safeProgressColor, 0.55)}, 0 0 20px -2px ${hexToRgba(safeProgressColor, 0.4)}`
            : isLoading
            ? `0 8px 24px -4px ${hexToRgba(safeProgressColor, 0.35)}`
            : `0 4px 18px -2px ${hexToRgba(safeAccent, 0.15)}`,
        }}
        {...(buttonProps as any)}
      >
        {/* ================= 1. 裁剪层：负责淡底色、鲜艳进度条填充以及双层无缝文字 ================= */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden py-3 sm:py-3.5 px-5 flex items-center justify-center transition-colors duration-300 border"
          style={{
            backgroundColor: hexToRgba(safeAccent, 0.12),
            borderColor: hexToRgba(
              isSuccess ? safeProgressColor : safeAccent,
              isSuccess ? 0.6 : isLoading ? 0.45 : 0.32
            ),
          }}
        >
          {/* A. 初始淡颜色的悬停微光加深层 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              backgroundColor: hexToRgba(safeAccent, 0.08),
            }}
          />

          {/* B. 提交后的鲜艳颜色进度条填充层 */}
          <motion.div
            className="absolute inset-y-0 left-0 pointer-events-none"
            initial={false}
            animate={{
              width: `${effectiveProgress}%`,
            }}
            transition={{
              duration: isSuccess ? 0.22 : 0.3,
              ease: isSuccess ? [0.25, 1, 0.5, 1] : 'easeOut',
            }}
            style={{
              background: `linear-gradient(90deg, ${deepProgress} 0%, ${safeProgressColor} 50%, ${highlightProgress} 100%)`,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.35), 0 0 20px ${hexToRgba(safeProgressColor, 0.6)}`,
            }}
          >
            {/* 进度条前端流动光斑 */}
            {isLoading && (
              <motion.div
                className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>

          {/* C. 成功触发时的柔和扩散光波 */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0.7, scale: 0.92 }}
                animate={{ opacity: 0, scale: 1.08 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  backgroundColor: '#ffffff',
                }}
              />
            )}
          </AnimatePresence>

          {/* D. 底层内容（未被鲜艳进度条覆盖的淡底区域）：呈现精致的主题强调色文字 */}
          <div
            className="relative z-10 w-full flex items-center justify-center font-semibold text-xs sm:text-sm tracking-wide transition-colors duration-200"
            style={{
              color: safeAccent,
            }}
          >
            <RenderButtonContent
              status={status}
              idleText={idleText}
              loadingText={loadingText}
              successText={successText}
              icon={icon}
              successIcon={successIcon}
            />
          </div>

          {/* E. 顶层剪裁内容（覆盖在鲜艳进度条之上）：仅在进度 > 0 时渲染，呈现纯白高对比文字与发光 */}
          {effectiveProgress > 0 && (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center font-semibold text-xs sm:text-sm tracking-wide text-white"
              style={{
                clipPath: `inset(0 ${Math.max(0, 100 - effectiveProgress)}% 0 0 round 1rem)`,
                WebkitClipPath: `inset(0 ${Math.max(0, 100 - effectiveProgress)}% 0 0 round 1rem)`,
                textShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }}
            >
              <RenderButtonContent
                status={status}
                idleText={idleText}
                loadingText={loadingText}
                successText={successText}
                icon={icon}
                successIcon={successIcon}
                isOverlay
              />
            </div>
          )}
        </div>

        {/* ================= 2. 外部边框层：成功后立刻触发的 border 线条双向滚动动画 ================= */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-2xl z-30"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <AnimatePresence>
            {isSuccess && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* 成功状态下的全闭合柔白微光底轨 */}
                <rect
                  x={strokeInset}
                  y={strokeInset}
                  width={rectWidth}
                  height={rectHeight}
                  rx={16}
                  ry={16}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth={1.5}
                />

                {/* 双向光束 1：顺时针方向快速飞驰流动 (Clockwise Running Beam) */}
                <motion.rect
                  x={strokeInset}
                  y={strokeInset}
                  width={rectWidth}
                  height={rectHeight}
                  rx={16}
                  ry={16}
                  pathLength={100}
                  strokeDasharray="25 75"
                  strokeLinecap="round"
                  stroke="#ffffff"
                  strokeWidth={2.6}
                  fill="none"
                  filter={`url(#${filterId})`}
                  animate={
                    shouldReduceMotion
                      ? { opacity: [0.7, 1, 0.7] }
                      : { strokeDashoffset: [startOffset, startOffset - 100] }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 1.5, repeat: Infinity, ease: 'linear' }
                  }
                  style={{
                    filter: `drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 8px ${safeProgressColor}) drop-shadow(0 0 14px ${safeProgressColor})`,
                  }}
                />

                {/* 双向光束 2：逆时针方向对向快速飞驰流动 (Counter-Clockwise Running Beam) */}
                <motion.rect
                  x={strokeInset}
                  y={strokeInset}
                  width={rectWidth}
                  height={rectHeight}
                  rx={16}
                  ry={16}
                  pathLength={100}
                  strokeDasharray="25 75"
                  strokeLinecap="round"
                  stroke="#ffffff"
                  strokeWidth={2.6}
                  fill="none"
                  filter={`url(#${filterId})`}
                  animate={
                    shouldReduceMotion
                      ? { opacity: [0.7, 1, 0.7] }
                      : { strokeDashoffset: [startOffset, startOffset + 100] }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 1.5, repeat: Infinity, ease: 'linear' }
                  }
                  style={{
                    filter: `drop-shadow(0 0 3px #ffffff) drop-shadow(0 0 8px ${safeProgressColor}) drop-shadow(0 0 14px ${safeProgressColor})`,
                  }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </motion.button>
    );
  }
);

ProgressSubmitButton.displayName = 'ProgressSubmitButton';

/**
 * 内部状态渲染器：负责在 idle / loading / success 间流畅切换文字与图标
 */
function RenderButtonContent({
  status,
  idleText,
  loadingText,
  successText,
  icon,
  successIcon,
  isOverlay,
}: {
  status: SubmitButtonStatus;
  idleText: React.ReactNode;
  loadingText: React.ReactNode;
  successText: React.ReactNode;
  icon?: React.ReactNode;
  successIcon?: React.ReactNode;
  isOverlay?: boolean;
}) {
  if (status === 'success') {
    return (
      <span className="flex items-center justify-center gap-2">
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="shrink-0"
        >
          {successIcon || <FiCheck className="size-4.5 stroke-[2.5]" />}
        </motion.span>
        <span>{successText}</span>
      </span>
    );
  }

  if (status === 'loading') {
    return (
      <span className="flex items-center justify-center gap-2.5">
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
        <span>{loadingText}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-center gap-2 group-hover:gap-2.5 transition-all duration-200">
      <span>{idleText}</span>
      {icon && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
          {icon}
        </span>
      )}
    </span>
  );
}

export default ProgressSubmitButton;
