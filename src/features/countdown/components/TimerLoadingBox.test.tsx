import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import TimerLoadingBox from './TimerLoadingBox';

describe('TimerLoadingBox component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders box element with role status and aria-label', () => {
    render(<TimerLoadingBox color="#3b82f6" />);
    const box = screen.getByTestId('timer-loading-box');
    expect(box).toBeInTheDocument();
    expect(box).toHaveClass('box');
    expect(box).toHaveAttribute('role', 'status');
    expect(box.style.getPropertyValue('--hue-1')).toBe('#3b82f6');
  });

  it('falls back to primary color variable when no color is provided', () => {
    render(<TimerLoadingBox />);
    const box = screen.getByTestId('timer-loading-box');
    expect(box).toBeInTheDocument();
    expect(box.style.getPropertyValue('--hue-1')).toBe('rgb(var(--color-primary))');
  });
});
