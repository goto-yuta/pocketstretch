import { ALL_STRETCHES } from '../src/data/stretches';

describe('stretch bodyPart tags', () => {
  it('ensures all wrist/finger stretches are tagged as arm (not shoulder)', () => {
    const wristIds = [
      'wrist-flexor-stretch',
      'wrist-extensor-stretch',
      'finger-flexor-stretch',
      'finger-extensor-stretch',
    ];
    for (const id of wristIds) {
      const s = ALL_STRETCHES.find((x) => x.id === id);
      expect(s).toBeDefined();
      expect(s!.bodyParts).toEqual(['arm']);
    }
  });
});
