import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import TimerSkeleton from './TimerSkeleton';

describe('TimerSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders skeleton cards with default 3 columns and accessible role', () => {
    render(<TimerSkeleton />);

    const skeleton = screen.getByTestId('timer-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', '正在加载时间');

    // Default 3 cards
    const cards = skeleton.querySelectorAll('.liquid-glass-digit');
    expect(cards.length).toBe(3);
  });

  it('renders specified number of columns and title placeholder when showTitle is true', () => {
    render(<TimerSkeleton columns={4} showTitle={true} />);

    const skeleton = screen.getByTestId('timer-skeleton');
    const cards = skeleton.querySelectorAll('.liquid-glass-digit');
    expect(cards.length).toBe(4);

    const titleSkeleton = skeleton.querySelector('.animate-pulse');
    expect(titleSkeleton).toBeInTheDocument();
  });
});
