import { describe, expect, it } from 'vitest';
import { getTimerType, parseTimer } from './timer';

describe('timer boundary parsing', () => {
  it('treats old records without a type as countdowns and retains fields', () => {
    const timer = parseTimer({
      id: 'legacy',
      name: 'Legacy timer',
      targetDate: '2026-01-01T00:00:00.000Z',
      timezone: 'UTC',
      legacyField: 'keep-me',
    });

    expect(timer).toMatchObject({ type: undefined, id: 'legacy', legacyField: 'keep-me' });
    expect(getTimerType(timer ?? {})).toBe('countdown');
  });

  it('rejects malformed records without throwing', () => {
    expect(parseTimer({ name: 'missing id' })).toBeNull();
  });

  it('normalizes stopwatch state at the boundary', () => {
    expect(parseTimer({ id: 'watch', name: 'Watch', type: 'stopwatch' })).toMatchObject({
      type: 'stopwatch',
      isRunning: false,
      totalPausedTime: 0,
      laps: [],
    });
  });

  it('preserves short-term countdown type and durationSeconds', () => {
    const timer = parseTimer({
      id: 'short-1',
      name: '25分钟番茄钟',
      type: 'countdown',
      countdownType: 'short',
      durationSeconds: 1500,
      targetDate: '2026-10-17T12:25:00.000Z',
    });
    expect(timer).toMatchObject({
      id: 'short-1',
      countdownType: 'short',
      durationSeconds: 1500,
    });
  });
});
