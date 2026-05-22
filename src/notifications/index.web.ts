import { SchedulerConfig } from '../types';

export function parseTimeString(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

export function buildDailyTriggers(
  times: string[]
): Array<{ hour: number; minute: number }> {
  return times.map((t) => parseTimeString(t));
}

export async function requestPermissions(): Promise<boolean> {
  return false;
}

export async function scheduleNotifications(_times: string[]): Promise<void> {}

export async function cancelAllNotifications(): Promise<void> {}

export async function scheduleNextStretchNotification(
  _lastCompletedAt: string,
  _config: SchedulerConfig
): Promise<void> {}
