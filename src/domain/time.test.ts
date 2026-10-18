import { describe, expect, it } from 'vitest';
import { formatTimeUnit, getStopwatchElapsed, splitCalendarDuration, splitCountdown } from './time';

describe('time domain functions', () => {
  it('splits a countdown without changing the display units', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const target = Date.parse('2026-01-02T02:03:04.567Z');
    expect(splitCountdown(target, now)).toMatchObject({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      milliseconds: 567,
      isExpired: false,
    });
  });

  it('clamps expired countdowns to zero', () => {
    expect(splitCountdown(1000, 2000)).toMatchObject({
      totalMilliseconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    });
  });

  it('subtracts paused time from a stopwatch', () => {
    expect(getStopwatchElapsed({
      startTime: 1000,
      isRunning: false,
      pausedAt: 10000,
      totalPausedTime: 2500,
    }, 20000)).toBe(6500);
  });

  it('pads display units', () => {
    expect(formatTimeUnit(4)).toBe('04');
  });

  describe('splitCalendarDuration across DST transitions', () => {
    const ny = 'America/New_York';

    it('splits a plain interval into calendar units', () => {
      const start = Date.parse('2026-01-01T05:00:00.000Z'); // 2026-01-01 00:00 EST
      const end = Date.parse('2026-01-02T07:03:04.000Z');   // 2026-01-02 02:03:04 EST
      expect(splitCalendarDuration(start, end, ny)).toEqual({
        years: 0,
        months: 0,
        days: 1,
        hours: 2,
        minutes: 3,
        seconds: 4,
      });
    });

    it('keeps wall-clock day counts stable across spring forward', () => {
      const start = Date.parse('2026-03-07T17:00:00.000Z'); // Mar 7 12:00 EST
      const end = Date.parse('2026-03-09T16:00:00.000Z');   // Mar 9 12:00 EDT
      expect(splitCalendarDuration(start, end, ny)).toEqual({
        years: 0,
        months: 0,
        days: 2,
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
    });

    it('reports the real elapsed hours inside a DST gap', () => {
      const start = Date.parse('2026-03-08T06:00:00.000Z'); // Mar 8 01:00 EST
      const end = Date.parse('2026-03-08T08:00:00.000Z');   // Mar 8 04:00 EDT
      expect(splitCalendarDuration(start, end, ny)).toMatchObject({
        years: 0,
        months: 0,
        days: 0,
        hours: 2,
        minutes: 0,
        seconds: 0,
      });
    });

    it('handles multi-month spans over a fall back transition', () => {
      const start = Date.parse('2026-01-15T15:00:00.000Z'); // Jan 15 10:00 EST
      const end = Date.parse('2027-03-17T13:00:00.000Z');   // Mar 17 09:00 EDT
      expect(splitCalendarDuration(start, end, ny)).toEqual({
        years: 1,
        months: 2,
        days: 1,
        hours: 23,
        minutes: 0,
        seconds: 0,
      });
    });
  });
});
