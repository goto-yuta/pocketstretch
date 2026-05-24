import * as Notifications from 'expo-notifications';
import { parseTimeString, buildDailyTriggers, scheduleNextStretchNotification } from '../src/notifications';
import { ensureNotificationPermission } from '../src/notifications';
import { SchedulerConfig } from '../src/types';

describe('parseTimeString', () => {
  it('parses HH:MM into hours and minutes', () => {
    expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeString('14:00')).toEqual({ hour: 14, minute: 0 });
  });
});

describe('buildDailyTriggers', () => {
  it('returns one trigger per time string', () => {
    const triggers = buildDailyTriggers(['08:00', '12:30', '18:00']);
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toEqual({ hour: 8, minute: 0 });
    expect(triggers[2]).toEqual({ hour: 18, minute: 0 });
  });
});

describe('scheduleNextStretchNotification', () => {
  it('is a function', () => {
    expect(typeof scheduleNextStretchNotification).toBe('function');
  });
});

describe('ensureNotificationPermission', () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns 'granted' when already granted (no re-request)", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: true, canAskAgain: true } as any);
    const req = jest.spyOn(Notifications, 'requestPermissionsAsync');
    await expect(ensureNotificationPermission()).resolves.toBe('granted');
    expect(req).not.toHaveBeenCalled();
  });

  it('requests when undetermined and returns the request result', async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ granted: true, canAskAgain: true } as any);
    await expect(ensureNotificationPermission()).resolves.toBe('granted');
  });

  it("returns 'denied' when the request is rejected", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    await expect(ensureNotificationPermission()).resolves.toBe('denied');
  });

  it("returns 'blocked' when not granted and cannot ask again", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: false } as any);
    const req = jest.spyOn(Notifications, 'requestPermissionsAsync');
    await expect(ensureNotificationPermission()).resolves.toBe('blocked');
    expect(req).not.toHaveBeenCalled();
  });
});
