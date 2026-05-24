import { shouldNavigateToGateFromState } from '../src/navigation';

const cfg = { enabled: true, dailyCount: 3 as const, activeHoursStart: '00:00', activeHoursEnd: '23:59' };

describe('shouldNavigateToGateFromState', () => {
  it('returns false before onboarding', () => {
    expect(shouldNavigateToGateFromState(false, null, cfg)).toBe(false);
  });
  it('returns true when onboarded and a gate is due (no completion yet)', () => {
    expect(shouldNavigateToGateFromState(true, null, cfg)).toBe(true);
  });
  it('returns false when scheduler disabled', () => {
    expect(shouldNavigateToGateFromState(true, null, { ...cfg, enabled: false })).toBe(false);
  });
});
