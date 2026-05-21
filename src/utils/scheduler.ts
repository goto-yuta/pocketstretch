import { SchedulerConfig } from '../types';

export function calcIntervalHours(config: SchedulerConfig): number {
  if (config.dailyCount <= 0) {
    throw new RangeError(`dailyCount must be >= 1, got ${config.dailyCount}`);
  }
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);
  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const activeHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  return activeHours / config.dailyCount;
}

export function isWithinActiveHours(config: SchedulerConfig, now: Date = new Date()): boolean {
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);
  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

export function shouldShowGate(
  lastStretchCompletedAt: string | null,
  config: SchedulerConfig,
  now: Date = new Date()
): boolean {
  if (!config.enabled) return false;
  if (!isWithinActiveHours(config, now)) return false;
  if (lastStretchCompletedAt === null) return true;
  const interval = calcIntervalHours(config);
  const elapsed = (now.getTime() - new Date(lastStretchCompletedAt).getTime()) / (60 * 60 * 1000);
  return elapsed >= interval;
}

export function calcNextStretchTime(
  lastCompletedAt: string,
  config: SchedulerConfig
): Date {
  const interval = calcIntervalHours(config);
  const last = new Date(lastCompletedAt);
  const next = new Date(last.getTime() + interval * 60 * 60 * 1000);

  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);

  const endOfDay = new Date(next);
  endOfDay.setHours(endH, endM, 0, 0);

  const startOfDay = new Date(next);
  startOfDay.setHours(startH, startM, 0, 0);

  if (next >= endOfDay) {
    // same-day overshoot (e.g., 23:40 > 22:00) → next day activeHoursStart
    const tomorrow = new Date(next);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(startH, startM, 0, 0);
    return tomorrow;
  }

  if (next < startOfDay) {
    // midnight-crossing (e.g., 00:40 < 08:00) → same day activeHoursStart
    const sameDay = new Date(next);
    sameDay.setHours(startH, startM, 0, 0);
    return sameDay;
  }

  return next;
}
