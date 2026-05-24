import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import CompletionScreen from '../../src/screens/CompletionScreen';
import * as StoreReview from 'expo-store-review';

jest.mock('expo-store-review');

const mockRecordReview = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { completedStretchIds: ['neck-side'] } }),
}));
jest.mock('../../src/notifications', () => ({
  scheduleNextStretchNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: () => ({
    markStretchesCompleted: jest.fn(),
    recordStretchCompletion: jest.fn(),
    schedulerConfig: { enabled: true, dailyCount: 3, activeHoursStart: '08:00', activeHoursEnd: '22:00' },
    currentStreak: 5,
    totalSessions: 12,
    lastReviewRequestAt: null,
    recordReviewRequest: mockRecordReview,
  }),
}));

test('完了画面に連続日数と累計回数が表示される', () => {
  const { getByText } = render(<CompletionScreen />);
  expect(getByText('🔥 5日連続')).toBeTruthy();
  expect(getByText('12回')).toBeTruthy();
});

test('完了時に条件を満たせばレビュー依頼を出す', async () => {
  render(<CompletionScreen />);
  await waitFor(() => expect(StoreReview.requestReview).toHaveBeenCalled());
  expect(mockRecordReview).toHaveBeenCalled();
});
