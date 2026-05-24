import { SchedulerConfig } from '../types';

export async function cancelAllNotifications(): Promise<void> {}

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

export async function ensureNotificationPermission(): Promise<PermissionOutcome> {
  return 'denied';
}

export async function scheduleNextStretchNotification(
  _lastCompletedAt: string,
  _config: SchedulerConfig
): Promise<void> {}
