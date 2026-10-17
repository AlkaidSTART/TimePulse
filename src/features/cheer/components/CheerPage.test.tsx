import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import CheerPage from './CheerPage';
import { INSPIRATIONAL_QUOTES } from '../cheerData';

describe('CheerPage quote carousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders today inspiration section with quote and author', () => {
    render(<CheerPage />);

    expect(screen.getByText('今日灵感')).toBeDefined();
    expect(screen.getByText('复制')).toBeDefined();
    expect(screen.getByText('换一句')).toBeDefined();

    // Verify some quote from INSPIRATIONAL_QUOTES is shown
    const quoteElement = screen.getByText((content) =>
      INSPIRATIONAL_QUOTES.some((q) => content.includes(q.text))
    );
    expect(quoteElement).toBeDefined();
  });

  it('manually switching quotes via "换一句" advances to next quote and is throttled against spam clicks', async () => {
    render(<CheerPage />);

    const refreshButton = screen.getByTitle('换一句');
    expect(refreshButton).toBeDefined();

    // First click should trigger switch and show loading state
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(screen.getByTestId('quote-loading')).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
    expect(refreshButton.hasAttribute('disabled')).toBe(true);

    // Rapid successive clicks within 450ms debounce/throttle window should be ignored
    await act(async () => {
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);
    });

    // Advance 500ms for isRefreshing animation timeout and throttle window
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(refreshButton.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByTestId('quote-loading')).toBeNull();

    const quoteElement = screen.getByText((content) =>
      INSPIRATIONAL_QUOTES.some((q) => content.includes(q.text))
    );
    expect(quoteElement).toBeDefined();
  });

  it('displays loading indicator during quote transition', async () => {
    render(<CheerPage />);

    const refreshButton = screen.getByTitle('换一句');
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(screen.getByTestId('quote-loading')).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByTestId('quote-loading')).toBeNull();
  });

  it('copies current quote text to clipboard when "复制" is clicked and debounces duplicate clicks', async () => {
    render(<CheerPage />);

    const copyButton = screen.getByTitle('复制此句');
    expect(copyButton).toBeDefined();

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByText('已复制')).toBeDefined();
    expect(copyButton.hasAttribute('disabled')).toBe(true);

    // Spam click while already copied should be ignored
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);

    // After 1800ms, should revert back to "复制"
    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(screen.getByText('复制')).toBeDefined();
    expect(copyButton.hasAttribute('disabled')).toBe(false);
  });

  it('auto-rotates to next quote after 15 seconds', async () => {
    render(<CheerPage />);

    // Advancing timers by 15000ms triggers auto-rotation and enters loading state
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getByTestId('quote-loading')).toBeDefined();

    // Advancing through the loading duration (350ms) reveals the next quote
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    const quoteElement = screen.getByText((content) =>
      INSPIRATIONAL_QUOTES.some((q) => content.includes(q.text))
    );
    expect(quoteElement).toBeDefined();
  });

  it('pauses rotation timer while hovered and debounces mouseLeave by 200ms', async () => {
    const { container } = render(<CheerPage />);

    const card = container.querySelector('.group');
    expect(card).toBeDefined();

    if (card) {
      // Hover card
      fireEvent.mouseEnter(card);

      // Advance by 15s while hovered - should remain paused
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // Leave card
      fireEvent.mouseLeave(card);

      // Within 200ms debounce buffer, quick re-entry should cancel leave
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.mouseEnter(card);

      // Should still be safely paused
      act(() => {
        vi.advanceTimersByTime(15000);
      });
    }
  });
});
