import {
  calcIntervalHours,
  isWithinActiveHours,
  shouldShowGate,
  calcNextStretchTime,
} from '../src/utils/scheduler';
import { SchedulerConfig } from '../src/types';

const defaultConfig: SchedulerConfig = {
  enabled: true,
  dailyCount: 3,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
};

describe('calcIntervalHours', () => {
  it('calculates 14/3 for 08:00-22:00 with dailyCount 3', () => {
    expect(calcIntervalHours(defaultConfig)).toBeCloseTo(14 / 3);
  });
  it('calculates 4 for 09:00-17:00 with dailyCount 2', () => {
    const config: SchedulerConfig = { ...defaultConfig, dailyCount: 2, activeHoursStart: '09:00', activeHoursEnd: '17:00' };
    expect(calcIntervalHours(config)).toBe(4);
  });
});

describe('isWithinActiveHours', () => {
  it('returns true at exactly activeHoursStart', () => {
    const now = new Date(2026, 4, 21, 8, 0, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(true);
  });
  it('returns false at exactly activeHoursEnd', () => {
    const now = new Date(2026, 4, 21, 22, 0, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(false);
  });
  it('returns false one minute before activeHoursStart', () => {
    const now = new Date(2026, 4, 21, 7, 59, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(false);
  });
  it('returns true during active hours', () => {
    const now = new Date(2026, 4, 21, 14, 30, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(true);
  });
});

describe('shouldShowGate', () => {
  const now = new Date(2026, 4, 21, 14, 0, 0);

  it('returns true when lastStretchCompletedAt is null (first use)', () => {
    expect(shouldShowGate(null, defaultConfig, now)).toBe(true);
  });
  it('returns false when interval has not elapsed', () => {
    const recent = new Date(2026, 4, 21, 11, 0, 0).toISOString(); // 3h ago, interval ~4.67h
    expect(shouldShowGate(recent, defaultConfig, now)).toBe(false);
  });
  it('returns true when interval has elapsed', () => {
    const old = new Date(2026, 4, 21, 8, 0, 0).toISOString(); // 6h ago
    expect(shouldShowGate(old, defaultConfig, now)).toBe(true);
  });
  it('returns false outside active hours', () => {
    const outside = new Date(2026, 4, 21, 23, 0, 0);
    expect(shouldShowGate(null, defaultConfig, outside)).toBe(false);
  });
  it('returns false when enabled is false', () => {
    const disabled = { ...defaultConfig, enabled: false };
    expect(shouldShowGate(null, disabled, now)).toBe(false);
  });
});

describe('calcNextStretchTime', () => {
  it('adds intervalHours to lastCompletedAt within active hours', () => {
    const last = new Date(2026, 4, 21, 10, 0, 0).toISOString();
    const result = calcNextStretchTime(last, defaultConfig);
    // 10:00 + (14/3)h ≈ 14:40
    expect(result.getDate()).toBe(21);
    expect(result.getHours()).toBe(14);
  });
  it('returns same-day activeHoursStart when result crosses midnight into early hours', () => {
    const last = new Date(2026, 4, 21, 20, 0, 0).toISOString();
    const result = calcNextStretchTime(last, defaultConfig);
    // 20:00 + 4.67h = 00:40 May 22 → before 08:00 → return May 22 08:00
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });

  it('rolls over to next day activeHoursStart when result exceeds activeHoursEnd', () => {
    // Use dailyCount=5 so interval = 14/5 = 2.8h
    // last=21:00, next=23:48 which > 22:00 → next day 08:00
    const config5: SchedulerConfig = { ...defaultConfig, dailyCount: 5 };
    const last = new Date(2026, 4, 21, 21, 0, 0).toISOString();
    const result = calcNextStretchTime(last, config5);
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });
});
