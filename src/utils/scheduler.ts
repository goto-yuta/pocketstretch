import { SchedulerConfig } from '../types';

export function calcIntervalHours(config: SchedulerConfig): number {
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

  const nextHours = next.getHours();
  const nextMinutes = next.getMinutes();
  const nextTimeInMinutes = nextHours * 60 + nextMinutes;
  const endTimeInMinutes = endH * 60 + endM;
  const startTimeInMinutes = startH * 60 + startM;

  // If next time is outside active hours, move to next day's activeHoursStart
  if (nextTimeInMinutes >= endTimeInMinutes || nextTimeInMinutes < startTimeInMinutes) {
    const tomorrow = new Date(next);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(startH, startM, 0, 0);
    return tomorrow;
  }
  return next;
}
