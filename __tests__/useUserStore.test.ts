import { act, renderHook } from '@testing-library/react-native';
import { useUserStore } from '../src/store/useUserStore';

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      notificationEnabled: false,
      notificationTimes: [],
      dailyProgress: { date: '', completedStretchIds: [] },
    });
  });

  it('sets body parts', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setBodyParts(['neck', 'shoulder']));
    expect(result.current.bodyParts).toEqual(['neck', 'shoulder']);
  });

  it('sets scene', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setScene('serious'));
    expect(result.current.scene).toBe('serious');
  });

  it('completes onboarding', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.completeOnboarding());
    expect(result.current.onboardingCompleted).toBe(true);
  });

  it('sets notification times', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setNotificationTimes(['09:00', '14:00']));
    expect(result.current.notificationTimes).toEqual(['09:00', '14:00']);
  });
});

describe('markStretchesCompleted', () => {
  it('marks stretches as completed for today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck', 'neck-side']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck', 'neck-side']);
  });

  it('deduplicates when called multiple times on same day', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    act(() => result.current.markStretchesCompleted(['chin-tuck', 'neck-side']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck', 'neck-side']);
  });

  it('resets progress when date is different from today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => {
      useUserStore.setState({
        dailyProgress: { date: '2020-01-01', completedStretchIds: ['old-stretch'] },
      });
    });
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck']);
    expect(result.current.dailyProgress.completedStretchIds).not.toContain('old-stretch');
  });

  it('sets date to today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    const today = new Date().toISOString().slice(0, 10);
    expect(result.current.dailyProgress.date).toBe(today);
  });
});
