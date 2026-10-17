import { useEffect, useMemo, useRef, useState } from 'react';

export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

export type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

/**
 * Standard debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate && lastArgs) {
        func.apply(lastThis, lastArgs);
        lastArgs = null;
        lastThis = null;
      }
    }, wait);

    if (callNow) {
      func.apply(this, args);
      lastArgs = null;
      lastThis = null;
    }
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
  };

  return debounced;
}

/**
 * Standard throttle function with leading and trailing options
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): ThrottledFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;

  const leading = options.leading !== false;
  const trailing = options.trailing !== false;

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (!previous && !leading) previous = now;
    const remaining = wait - (now - previous);

    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      previous = now;
      func.apply(this, args);
      lastArgs = null;
      lastThis = null;
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeoutId = null;
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, remaining);
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    previous = 0;
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * React hook returning a debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook returning a stable debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): DebouncedFunction<T> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(() => {
    return debounce((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

/**
 * React hook returning a stable throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): ThrottledFunction<T> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(() => {
    return throttle(
      (...args: Parameters<T>) => {
        return callbackRef.current(...args);
      },
      delay,
      options,
    );
  }, [delay, options.leading, options.trailing]);
}
