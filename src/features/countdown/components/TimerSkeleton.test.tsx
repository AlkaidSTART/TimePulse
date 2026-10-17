import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import TimerSkeleton from './TimerSkeleton';

describe('TimerSkeleton backward compatibility', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders minimalist loading animation with accessible role and timer-skeleton testid', () => {
    render(<TimerSkeleton />);

    const skeleton = screen.getByTestId('timer-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', '正在加载时间');
  });

  it('gracefully handles legacy columns and showTitle props', () => {
    render(<TimerSkeleton columns={4} showTitle={true} />);

    const skeleton = screen.getByTestId('timer-skeleton');
    expect(skeleton).toBeInTheDocument();
  });
});
