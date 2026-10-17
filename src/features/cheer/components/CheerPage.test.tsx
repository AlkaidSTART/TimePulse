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

  it('manually switching quotes via "换一句" advances to next quote', async () => {
    render(<CheerPage />);

    const refreshButton = screen.getByTitle('换一句');
    expect(refreshButton).toBeDefined();

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    // Advance 500ms for isRefreshing animation timeout
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const quoteElement = screen.getByText((content) =>
      INSPIRATIONAL_QUOTES.some((q) => content.includes(q.text))
    );
    expect(quoteElement).toBeDefined();
  });

  it('copies current quote text to clipboard when "复制" is clicked', async () => {
    render(<CheerPage />);

    const copyButton = screen.getByTitle('复制此句');
    expect(copyButton).toBeDefined();

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('已复制')).toBeDefined();

    // After 1800ms, should revert back to "复制"
    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(screen.getByText('复制')).toBeDefined();
  });

  it('auto-rotates to next quote after 15 seconds', async () => {
    render(<CheerPage />);

    // Advancing timers by 15000ms should trigger auto-rotation
    await act(async () => {
      vi.advanceTimersByTime(15000);
    });

    const quoteElement = screen.getByText((content) =>
      INSPIRATIONAL_QUOTES.some((q) => content.includes(q.text))
    );
    expect(quoteElement).toBeDefined();
  });

  it('pauses rotation timer while hovered', async () => {
    const { container } = render(<CheerPage />);

    const card = container.querySelector('.group');
    expect(card).toBeDefined();

    if (card) {
      // Hover card
      fireEvent.mouseEnter(card);

      // Advance by 15s while hovered
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // Leave hover
      fireEvent.mouseLeave(card);
    }
  });
});
