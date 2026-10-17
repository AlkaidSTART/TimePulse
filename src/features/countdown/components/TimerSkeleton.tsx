import TimerLoading, { type TimerLoadingProps } from './TimerLoading';

export interface TimerSkeletonProps extends TimerLoadingProps {
  columns?: number;
  showTitle?: boolean;
}

/**
 * @deprecated 骨架屏已替换为简约 loading 动画，保留此组件用于向下兼容
 */
export default function TimerSkeleton({
  columns: _columns,
  showTitle: _showTitle,
  dataTestId = 'timer-skeleton',
  ...props
}: TimerSkeletonProps) {
  return <TimerLoading dataTestId={dataTestId} {...props} />;
}
