import * as Notifications from 'expo-notifications';

export function parseTimeString(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

export function buildDailyTriggers(
  times: string[]
): Array<{ hour: number; minute: number; repeats: true }> {
  return times.map((t) => ({ ...parseTimeString(t), repeats: true as const }));
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
      trigger: { hour, minute, repeats: true },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
