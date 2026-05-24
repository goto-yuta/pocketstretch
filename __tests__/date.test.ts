import { getLocalDateString } from '../src/utils/date';

describe('getLocalDateString', () => {
  it('formats a given date as local YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 24, 23, 30);
    expect(getLocalDateString(d)).toBe('2026-05-24');
  });
  it('uses the local calendar day at start of day', () => {
    const d = new Date(2026, 0, 1, 0, 30);
    expect(getLocalDateString(d)).toBe('2026-01-01');
  });
  it('defaults to now', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDateString()).toBe(expected);
  });
});
