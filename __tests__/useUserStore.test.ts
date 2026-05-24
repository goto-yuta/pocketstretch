import { act, renderHook } from '@testing-library/react-native';
import { useUserStore } from '../src/store/useUserStore';
import { getLocalDateString } from '../src/utils/date';

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      schedulerConfig: {
        enabled: true,
        dailyCount: 3,
        activeHoursStart: '08:00',
        activeHoursEnd: '22:00',
      },
      dailyProgress: { date: '', completedStretchIds: [] },
      lastStretchCompletedAt: null,
      dailySkipUsed: false,
      lastSkipDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastCompletedDate: null,
      lastReviewRequestAt: null,
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
    const today = getLocalDateString();
    expect(result.current.dailyProgress.date).toBe(today);
  });
});

describe('setSport', () => {
  beforeEach(() => {
    useUserStore.setState({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      dailyProgress: { date: '', completedStretchIds: [] },
    });
  });

  it('sets sport', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setSport('running'));
    expect(result.current.sport).toBe('running');
  });

  it('initial sport is empty string', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.sport).toBe('');
  });

  it('can clear sport', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setSport('golf'));
    act(() => result.current.setSport(''));
    expect(result.current.sport).toBe('');
  });
});

describe('setSchedulerConfig', () => {
  it('updates schedulerConfig', () => {
    const { result } = renderHook(() => useUserStore());
    const newConfig = { enabled: false, dailyCount: 2 as const, activeHoursStart: '09:00', activeHoursEnd: '21:00' };
    act(() => result.current.setSchedulerConfig(newConfig));
    expect(result.current.schedulerConfig).toEqual(newConfig);
  });
});

describe('recordStretchCompletion', () => {
  it('sets lastStretchCompletedAt to current time', () => {
    const before = Date.now();
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    const after = Date.now();
    const ts = new Date(result.current.lastStretchCompletedAt!).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('recordSkip', () => {
  it('sets dailySkipUsed to true and records today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordSkip());
    expect(result.current.dailySkipUsed).toBe(true);
    expect(result.current.lastSkipDate).toBe(getLocalDateString());
  });
  it('sets lastStretchCompletedAt to reset the interval timer', () => {
    const before = Date.now();
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordSkip());
    const ts = new Date(result.current.lastStretchCompletedAt!).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});

describe('recordReviewRequest', () => {
  beforeEach(() => {
    useUserStore.setState({ lastReviewRequestAt: null });
  });

  it('stamps lastReviewRequestAt with an ISO time', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.lastReviewRequestAt).toBeNull();
    act(() => result.current.recordReviewRequest());
    expect(typeof result.current.lastReviewRequestAt).toBe('string');
    expect(Number.isNaN(Date.parse(result.current.lastReviewRequestAt!))).toBe(false);
  });
});

describe('recordStretchCompletion streak tracking', () => {
  beforeEach(() => {
    useUserStore.setState({ currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null });
  });

  it('starts the streak at 1 on first completion today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalSessions).toBe(1);
    expect(result.current.lastCompletedDate).toBe(getLocalDateString());
  });

  it('does not advance the streak twice on the same day', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalSessions).toBe(2);
  });

  it('increments the streak when yesterday was completed', () => {
    const yesterday = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    useUserStore.setState({ currentStreak: 4, longestStreak: 4, totalSessions: 9, lastCompletedDate: yesterday });
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(5);
    expect(result.current.longestStreak).toBe(5);
  });
});
