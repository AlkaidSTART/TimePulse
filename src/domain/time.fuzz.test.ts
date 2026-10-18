import { describe, expect, it } from 'vitest';
import { splitCalendarDuration } from './time';

/**
 * 参考实现：优化前的逐样本偏移算法（无缓存、无快速路径）。
 * 与 time.ts 中优化后的实现做随机对拍，保证 DST 间隙/重复时间等
 * 边界行为完全一致。
 */

type WallClockParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function getParts(timestamp: number, timeZone: string): WallClockParts {
  const values: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(new Date(timestamp))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: ((timestamp % 1000) + 1000) % 1000,
  };
}

function getWallClockTimestamp(parts: WallClockParts): number {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, parts.millisecond);
  return date.getTime();
}

function sameWallClock(left: WallClockParts, right: WallClockParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute &&
    left.second === right.second && left.millisecond === right.millisecond;
}

function toTimestamp(parts: WallClockParts, timeZone: string): number {
  const wallClockTimestamp = getWallClockTimestamp(parts);
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 12) {
    const sampleTimestamp = wallClockTimestamp + hours * HOUR_MS;
    offsets.add(getWallClockTimestamp(getParts(sampleTimestamp, timeZone)) - sampleTimestamp);
  }
  const candidates = [...offsets].map((offset) => wallClockTimestamp - offset);
  const exactMatch = candidates
    .filter((candidate) => sameWallClock(getParts(candidate, timeZone), parts))
    .sort((left, right) => left - right);
  if (exactMatch.length > 0) return exactMatch[0];

  const afterRequestedTime = candidates
    .map((candidate) => ({
      candidate,
      wallClockDelta: getWallClockTimestamp(getParts(candidate, timeZone)) - wallClockTimestamp,
    }))
    .filter(({ wallClockDelta }) => wallClockDelta > 0)
    .sort((left, right) => left.wallClockDelta - right.wallClockDelta || left.candidate - right.candidate);
  if (afterRequestedTime.length > 0) return afterRequestedTime[0].candidate;
  return candidates[0] ?? wallClockTimestamp;
}

function getDaysInMonth(year: number, month: number): number {
  const lastDay = new Date(0);
  lastDay.setUTCHours(0, 0, 0, 0);
  lastDay.setUTCFullYear(year, month + 1, 0);
  return lastDay.getUTCDate();
}

function addMonths(anchor: WallClockParts, months: number, timeZone: string, anchorTimestamp: number): number {
  if (months === 0) return anchorTimestamp;
  const monthIndex = anchor.year * 12 + anchor.month - 1 + months;
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex - year * 12 + 1;
  const day = Math.min(anchor.day, getDaysInMonth(year, month - 1));
  return toTimestamp({ ...anchor, year, month, day }, timeZone);
}

function addDays(anchor: WallClockParts, days: number, timeZone: string, anchorTimestamp: number): number {
  if (days === 0) return anchorTimestamp;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(anchor.year, anchor.month - 1, anchor.day + days);
  return toTimestamp({
    ...anchor,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }, timeZone);
}

function getCalendarDayNumber(parts: WallClockParts): number {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  return date.getTime() / DAY_MS;
}

function referenceSplitCalendarDuration(startTimestamp: number, endTimestamp: number, timeZone: string) {
  if (endTimestamp <= startTimestamp) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const start = getParts(startTimestamp, timeZone);
  const end = getParts(endTimestamp, timeZone);
  let totalMonths = (end.year - start.year) * 12 + end.month - start.month;
  while (totalMonths > 0 && addMonths(start, totalMonths, timeZone, startTimestamp) > endTimestamp) {
    totalMonths -= 1;
  }
  while (addMonths(start, totalMonths + 1, timeZone, startTimestamp) <= endTimestamp) {
    totalMonths += 1;
  }
  const afterMonthsTimestamp = addMonths(start, totalMonths, timeZone, startTimestamp);
  const afterMonths = getParts(afterMonthsTimestamp, timeZone);
  let days = Math.max(0, getCalendarDayNumber(end) - getCalendarDayNumber(afterMonths));
  while (days > 0 && addDays(afterMonths, days, timeZone, afterMonthsTimestamp) > endTimestamp) {
    days -= 1;
  }
  while (addDays(afterMonths, days + 1, timeZone, afterMonthsTimestamp) <= endTimestamp) {
    days += 1;
  }
  const remainder = Math.max(0, endTimestamp - addDays(afterMonths, days, timeZone, afterMonthsTimestamp));
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    hours: Math.floor(remainder / HOUR_MS),
    minutes: Math.floor((remainder % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((remainder % MINUTE_MS) / 1000),
  };
}

describe('splitCalendarDuration', () => {
  it('matches the sampling reference across DST-heavy random cases', () => {
    const zones = ['America/New_York', 'Europe/Berlin', 'Asia/Shanghai', 'Australia/Sydney', 'UTC'];
    const base = Date.parse('2026-01-01T00:00:00.000Z');
    for (const timeZone of zones) {
      for (let i = 0; i < 400; i += 1) {
        const start = base + ((i * 7919) % (400 * DAY_MS)) + ((i * 3607) % DAY_MS);
        const span = ((i * 104729) % (900 * DAY_MS)) + 1000;
        const end = start + span;
        expect(
          splitCalendarDuration(start, end, timeZone),
          `tz=${timeZone} start=${new Date(start).toISOString()} end=${new Date(end).toISOString()}`,
        ).toEqual(referenceSplitCalendarDuration(start, end, timeZone));
      }
    }
  });
});
