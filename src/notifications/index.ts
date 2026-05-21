import * as Notifications from 'expo-notifications';
import { SchedulerConfig } from '../types';
import { calcIntervalHours, calcNextStretchTime } from '../utils/scheduler';

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
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotifications(times: string[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const time of times) {
    const { hour, minute } = parseTimeString(time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ストレッチの時間です！',
        body: 'ちょっとほぐしてリフレッシュしましょう',
        data: { screen: 'Session' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleNextStretchNotification(
  lastCompletedAt: string,
  config: SchedulerConfig
): Promise<void> {
  const next = calcNextStretchTime(lastCompletedAt, config);
  const hours = Math.round(calcIntervalHours(config));
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ストレッチの時間です！',
      body: `前回から約${hours}時間経ちました 💪`,
      data: { screen: 'Gate' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next,
    },
  });
}
