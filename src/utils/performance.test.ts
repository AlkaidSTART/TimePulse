import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, useDebouncedValue } from './performance';
import { renderHook, act } from '@testing-library/react';

describe('performance utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('debounces multiple rapid invocations', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      debounced('b');
      debounced('c');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('cancels pending invocation on cancel()', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('test');
      debounced.cancel();

      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });

    it('immediately executes pending invocation on flush()', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('flush-me');
      expect(fn).not.toHaveBeenCalled();

      debounced.flush();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('flush-me');

      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('supports immediate execution mode', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, true);

      debounced('instant');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('instant');

      debounced('ignored');
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60);
      debounced('again');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith('again');
    });
  });

  describe('throttle', () => {
    it('throttles rapid invocations within wait window', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');

      throttled('second');
      throttled('third');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('supports cancel()', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled.cancel();

      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDebouncedValue', () => {
    it('debounces value updates in React component', () => {
      const { result, rerender } = renderHook(({ val, delay }) => useDebouncedValue(val, delay), {
        initialProps: { val: 'initial', delay: 150 },
      });

      expect(result.current).toBe('initial');

      rerender({ val: 'updated-1', delay: 150 });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('initial');

      rerender({ val: 'updated-2', delay: 150 });
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current).toBe('updated-2');
    });
  });
});
