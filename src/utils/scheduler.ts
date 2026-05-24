import { SchedulerConfig } from '../types';

export function calcIntervalHours(config: SchedulerConfig): number {
  if (config.dailyCount <= 0) {
    throw new RangeError(`dailyCount must be >= 1, got ${config.dailyCount}`);
  }
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);
  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const activeHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  if (activeHours <= 0) {
    throw new RangeError(`active window must be positive, got start=${config.activeHoursStart} end=${config.activeHoursEnd}`);
  }
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

/** 動作時間帯が有効か（start < end かつ最低1時間）。Settings の調整で不正値を弾くのに使う。 */
export function isValidActiveWindow(start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin - startMin >= 60;
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
