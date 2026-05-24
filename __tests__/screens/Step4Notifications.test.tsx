import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Step4Notifications from '../../src/screens/onboarding/Step4Notifications';
import { ensureNotificationPermission } from '../../src/notifications';

const mockComplete = jest.fn();
const mockSetSched = jest.fn();
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: () => ({
    completeOnboarding: mockComplete,
    schedulerConfig: { enabled: true, dailyCount: 3, activeHoursStart: '08:00', activeHoursEnd: '22:00' },
    setSchedulerConfig: mockSetSched,
  }),
}));
jest.mock('../../src/notifications', () => ({
  ensureNotificationPermission: jest.fn().mockResolvedValue('granted'),
  scheduleNextStretchNotification: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('有効化ボタンで権限確認しオンボーディングを完了する', async () => {
  const { getByText } = render(<Step4Notifications />);
  fireEvent.press(getByText('通知を有効にする'));
  await waitFor(() => expect(mockComplete).toHaveBeenCalled());
});

test('スキップでもオンボーディングを完了する', () => {
  const { getByText } = render(<Step4Notifications />);
  fireEvent.press(getByText('スキップ'));
  expect(mockComplete).toHaveBeenCalled();
});

test('権限がblockedでもオンボーディングは完了する', async () => {
  (ensureNotificationPermission as jest.Mock).mockResolvedValueOnce('blocked');
  const { getByText } = render(<Step4Notifications />);
  fireEvent.press(getByText('通知を有効にする'));
  await waitFor(() => expect(mockComplete).toHaveBeenCalled());
  expect(mockSetSched).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
});
