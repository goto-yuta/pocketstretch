import { nextStreakState, streakMessage, StreakState } from '../src/utils/streak';

const base: StreakState = { currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null };

describe('nextStreakState', () => {
  it('starts a streak at 1 on first completion', () => {
    expect(nextStreakState(base, '2026-05-24')).toEqual({
      currentStreak: 1, longestStreak: 1, totalSessions: 1, lastCompletedDate: '2026-05-24',
    });
  });
  it('increments on a consecutive day', () => {
    const prev: StreakState = { currentStreak: 3, longestStreak: 3, totalSessions: 5, lastCompletedDate: '2026-05-23' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 4, longestStreak: 4, totalSessions: 6, lastCompletedDate: '2026-05-24',
    });
  });
  it('keeps streak but counts the session on a same-day repeat', () => {
    const prev: StreakState = { currentStreak: 4, longestStreak: 4, totalSessions: 6, lastCompletedDate: '2026-05-24' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 4, longestStreak: 4, totalSessions: 7, lastCompletedDate: '2026-05-24',
    });
  });
  it('resets to 1 after a gap', () => {
    const prev: StreakState = { currentStreak: 9, longestStreak: 9, totalSessions: 20, lastCompletedDate: '2026-05-20' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 1, longestStreak: 9, totalSessions: 21, lastCompletedDate: '2026-05-24',
    });
  });
  it('preserves longestStreak when current is lower', () => {
    const prev: StreakState = { currentStreak: 1, longestStreak: 10, totalSessions: 30, lastCompletedDate: '2026-05-22' };
    expect(nextStreakState(prev, '2026-05-24').longestStreak).toBe(10);
  });
  it('resets to 1 when today is earlier than lastCompletedDate (clock skew)', () => {
    const prev: StreakState = { currentStreak: 5, longestStreak: 5, totalSessions: 10, lastCompletedDate: '2026-05-24' };
    expect(nextStreakState(prev, '2026-05-22')).toEqual({
      currentStreak: 1, longestStreak: 5, totalSessions: 11, lastCompletedDate: '2026-05-22',
    });
  });
});

describe('streakMessage', () => {
  it('celebrates 30+ days', () => { expect(streakMessage(30)).toContain('30'); });
  it('celebrates 7+ days', () => { expect(streakMessage(7)).toContain('1週間'); });
  it('returns a non-empty message on day 1', () => { expect(streakMessage(1).length).toBeGreaterThan(0); });
  it('returns the keep-going message for mid-range streaks', () => {
    expect(streakMessage(3).length).toBeGreaterThan(0);
    expect(streakMessage(3)).not.toContain('1週間');
  });
});
