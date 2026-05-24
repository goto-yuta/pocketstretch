export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastCompletedDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 完了1回ぶんを反映した新しいストリーク状態を返す。today は YYYY-MM-DD。
 * - 同じ日に再完了: セッション数のみ +1、連続日数は据え置き
 * - 前日からの連続: currentStreak +1
 * - それ以外（初回 or 間隔が空いた）: currentStreak = 1
 */
export function nextStreakState(prev: StreakState, today: string): StreakState {
  if (prev.lastCompletedDate === today) {
    return { ...prev, totalSessions: prev.totalSessions + 1 };
  }
  const diffDays = prev.lastCompletedDate
    ? Math.round((Date.parse(today) - Date.parse(prev.lastCompletedDate)) / DAY_MS)
    : null;
  const currentStreak = diffDays === 1 ? prev.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    totalSessions: prev.totalSessions + 1,
    lastCompletedDate: today,
  };
}

/** 完了画面で見せる連続日数の祝福コピー。 */
export function streakMessage(currentStreak: number): string {
  if (currentStreak >= 30) return '30日連続達成！本当にすごい 🎉';
  if (currentStreak >= 7) return '1週間継続中！その調子 🔥';
  if (currentStreak === 1) return 'はじめの一歩、ナイス！';
  return 'この調子で続けよう！';
}
