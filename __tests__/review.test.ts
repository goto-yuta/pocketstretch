import { shouldRequestReview } from '../src/utils/review';

describe('shouldRequestReview', () => {
  it('does not ask before 3 completed sessions', () => {
    expect(shouldRequestReview(2, null)).toBe(false);
  });
  it('asks at 3 sessions when never asked before', () => {
    expect(shouldRequestReview(3, null)).toBe(true);
  });
  it('asks beyond 3 sessions when never asked', () => {
    expect(shouldRequestReview(10, null)).toBe(true);
  });
  it('does not ask again once already asked', () => {
    expect(shouldRequestReview(10, '2026-05-01T00:00:00.000Z')).toBe(false);
  });
});
