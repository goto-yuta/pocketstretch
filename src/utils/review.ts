const MIN_SESSIONS_FOR_REVIEW = 3;

/**
 * ストアレビュー依頼の可否（純関数）。
 * 累計セッションが閾値以上で、まだ一度も依頼していなければ true。
 */
export function shouldRequestReview(totalSessions: number, lastReviewRequestAt: string | null): boolean {
  return totalSessions >= MIN_SESSIONS_FOR_REVIEW && lastReviewRequestAt === null;
}
