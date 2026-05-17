import { parseTimeString, buildDailyTriggers } from '../src/notifications';

describe('parseTimeString', () => {
  it('parses HH:MM into hours and minutes', () => {
    expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeString('14:00')).toEqual({ hour: 14, minute: 0 });
  });
});

describe('buildDailyTriggers', () => {
  it('returns one trigger per time string with repeats:true', () => {
    const triggers = buildDailyTriggers(['08:00', '12:30', '18:00']);
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toEqual({ hour: 8, minute: 0, repeats: true });
    expect(triggers[2]).toEqual({ hour: 18, minute: 0, repeats: true });
  });
});
