import { describe, it, expect } from 'vitest';
import { getCurrentTimeSlot, getGreetingForUser, TIME_SLOTS } from './cheerData';

describe('cheerData time slots and greetings', () => {
  it('correctly maps morning hour to early_morning slot and greeting', () => {
    // 07:30 清晨
    const testDate = new Date(2026, 9, 17, 7, 30);
    const slot = getCurrentTimeSlot(testDate);
    expect(slot.id).toBe('early_morning');
    expect(slot.name).toBe('清晨');

    const greeting = getGreetingForUser(slot, '小明', 'energetic');
    expect(greeting).toContain('早上好呀');
    expect(greeting).toContain('今天也是元气满满的一天');
    expect(greeting).toContain('小明');
  });

  it('correctly maps noon hour to noon slot and asks if eaten', () => {
    // 12:30 中午
    const testDate = new Date(2026, 9, 17, 12, 30);
    const slot = getCurrentTimeSlot(testDate);
    expect(slot.id).toBe('noon');
    expect(slot.name).toBe('中午');

    const greeting = getGreetingForUser(slot, '小明', 'energetic');
    expect(greeting).toContain('中午好呀');
    expect(greeting).toContain('吃饱了吗');
  });

  it('correctly maps afternoon hour to afternoon slot', () => {
    // 15:30 下午
    const testDate = new Date(2026, 9, 17, 15, 30);
    const slot = getCurrentTimeSlot(testDate);
    expect(slot.id).toBe('afternoon');
    expect(slot.name).toBe('下午');

    const greeting = getGreetingForUser(slot, '', 'energetic');
    expect(greeting).toContain('下午好呀');
  });

  it('correctly maps late night hour to late_night slot', () => {
    // 01:30 深夜
    const testDate = new Date(2026, 9, 17, 1, 30);
    const slot = getCurrentTimeSlot(testDate);
    expect(slot.id).toBe('late_night');
    expect(slot.name).toBe('深夜');

    const greeting = getGreetingForUser(slot, '', 'warm');
    expect(greeting).toContain('夜深了');
    expect(greeting).toContain('早点休息');
  });

  it('supports all 7 time slots in TIME_SLOTS array', () => {
    expect(TIME_SLOTS.length).toBe(7);
  });
});
