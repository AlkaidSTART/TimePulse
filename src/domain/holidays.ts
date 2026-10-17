import solarlunar from 'solarlunar';
import type { Holiday } from './timer';

function getQingmingDate(year: number): Date {
  const day = Math.floor((year - 2000) * 0.2422 + 4.81) - Math.floor((year - 2000) / 4);
  return new Date(Date.UTC(year, 3, day));
}

function createUtcDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString();
}

export function generateFixedHolidays(year: number): Holiday[] {
  return [
    { name: `${year}年元旦`, date: createUtcDate(year, 0, 1), color: '#0EA5E9' },
    { name: `${year}年情人节`, date: createUtcDate(year, 1, 14), color: '#F43F5E' },
    { name: `${year}年妇女节`, date: createUtcDate(year, 2, 8), color: '#EC4899' },
    { name: `${year}年植树节`, date: createUtcDate(year, 2, 12), color: '#10B981' },
    { name: `${year}年愚人节`, date: createUtcDate(year, 3, 1), color: '#8B5CF6' },
    { name: `${year}年青年节`, date: createUtcDate(year, 4, 4), color: '#6366F1' },
    { name: `${year}年劳动节`, date: createUtcDate(year, 4, 1), color: '#F59E0B' },
    { name: `${year}年清明节`, date: getQingmingDate(year).toISOString(), color: '#059669' },
    { name: `${year}年儿童节`, date: createUtcDate(year, 5, 1), color: '#06B6D4' },
    { name: `${year}年建党节`, date: createUtcDate(year, 6, 1), color: '#E11D48' },
    { name: `${year}年建军节`, date: createUtcDate(year, 7, 1), color: '#BE123C' },
    { name: `${year}年教师节`, date: createUtcDate(year, 8, 10), color: '#3B82F6' },
    { name: `${year}年国庆节`, date: createUtcDate(year, 9, 1), color: '#E11D48' },
    { name: `${year}年万圣节`, date: createUtcDate(year, 9, 31), color: '#FB923C' },
    { name: `${year}年平安夜`, date: createUtcDate(year, 11, 24), color: '#14B8A6' },
    { name: `${year}年圣诞节`, date: createUtcDate(year, 11, 25), color: '#059669' },
  ];
}

export function calculateDynamicHolidays(year: number): Holiday[] {
  const firstDayOfMay = new Date(Date.UTC(year, 4, 1));
  const daysUntilSecondSunday = (7 - firstDayOfMay.getUTCDay()) % 7 + 7;
  const firstDayOfJune = new Date(Date.UTC(year, 5, 1));
  const daysUntilThirdSunday = (7 - firstDayOfJune.getUTCDay()) % 7 + 14;
  const firstDayOfNovember = new Date(Date.UTC(year, 10, 1));
  const daysToThursday = (4 + 7 - firstDayOfNovember.getUTCDay()) % 7;

  return [
    {
      name: `${year}年母亲节`,
      date: createUtcDate(year, 4, 1 + daysUntilSecondSunday),
      color: '#FB7185',
    },
    {
      name: `${year}年父亲节`,
      date: createUtcDate(year, 5, 1 + daysUntilThirdSunday),
      color: '#0EA5E9',
    },
    {
      name: `${year}年感恩节`,
      date: createUtcDate(year, 10, 1 + daysToThursday + 21),
      color: '#F59E0B',
    },
  ];
}

export function getChineseFestivals(year: number): Holiday[] {
  const mappings = [
    { name: `${year}年春节`, lunarMonth: 1, lunarDay: 1, color: '#E11D48' },
    { name: `${year}年元宵节`, lunarMonth: 1, lunarDay: 15, color: '#F97316' },
    { name: `${year}年端午节`, lunarMonth: 5, lunarDay: 5, color: '#16A34A' },
    { name: `${year}年七夕节`, lunarMonth: 7, lunarDay: 7, color: '#EC4899' },
    { name: `${year}年中元节`, lunarMonth: 7, lunarDay: 15, color: '#64748B' },
    { name: `${year}年中秋节`, lunarMonth: 8, lunarDay: 15, color: '#F59E0B' },
    { name: `${year}年重阳节`, lunarMonth: 9, lunarDay: 9, color: '#8B5CF6' },
    { name: `${year}年腊八节`, lunarMonth: 12, lunarDay: 8, color: '#B45309' },
  ];

  return mappings.flatMap((holiday) => {
    const solarDate = solarlunar.lunar2solar(year, holiday.lunarMonth, holiday.lunarDay, false);
    if (!solarDate || typeof solarDate !== 'object') return [];
    const value = solarDate as { cYear: number; cMonth: number; cDay: number };
    return [{
      name: holiday.name,
      date: new Date(Date.UTC(value.cYear, value.cMonth - 1, value.cDay)).toISOString(),
      color: holiday.color,
    }];
  });
}

export function getHolidaysList(now = new Date()): Holiday[] {
  const currentYear = now.getFullYear();
  const allHolidays = [
    ...generateFixedHolidays(currentYear),
    ...calculateDynamicHolidays(currentYear),
    ...getChineseFestivals(currentYear),
    ...generateFixedHolidays(currentYear + 1),
    ...calculateDynamicHolidays(currentYear + 1),
    ...getChineseFestivals(currentYear + 1),
  ];

  return allHolidays
    .filter((holiday) => new Date(holiday.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function findNextHoliday(now = new Date()): Holiday {
  return getHolidaysList(now)[0] ?? {
    name: `${now.getFullYear() + 1}年元旦`,
    date: createUtcDate(now.getFullYear() + 1, 0, 1),
    color: '#0EA5E9',
  };
}
