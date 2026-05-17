import { ALL_STRETCHES } from '../src/data/stretches';
import { filterStretches, getRecommended } from '../src/utils/filterStretches';
import { Stretch } from '../src/types';

const mockStretches: Stretch[] = [
  {
    id: 'a', nameJa: 'A', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 1,
    bodyParts: ['neck'], scenes: ['office'], steps: [],
  },
  {
    id: 'b', nameJa: 'B', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 2,
    bodyParts: ['shoulder', 'back'], scenes: ['home'], steps: [],
  },
];

describe('filterStretches', () => {
  it('filters by scene', () => {
    const result = filterStretches(mockStretches, { scene: 'office' });
    expect(result.map((s) => s.id)).toEqual(['a']);
  });

  it('filters by bodyPart', () => {
    const result = filterStretches(mockStretches, { bodyParts: ['shoulder'] });
    expect(result.map((s) => s.id)).toEqual(['b']);
  });

  it('returns all when no filter', () => {
    expect(filterStretches(mockStretches, {})).toHaveLength(2);
  });

  it('scene AND bodyPart both must match', () => {
    const result = filterStretches(mockStretches, { scene: 'office', bodyParts: ['back'] });
    expect(result).toHaveLength(0);
  });
});

describe('getRecommended', () => {
  it('returns up to 5 stretches', () => {
    const result = getRecommended(ALL_STRETCHES, ['neck', 'shoulder'], 'office');
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThan(0);
  });

  it('prefers stretches matching both scene and bodyPart', () => {
    const result = getRecommended(ALL_STRETCHES, ['neck'], 'office');
    // neck-side matches both neck AND office → should appear first
    expect(result[0].id).toBe('neck-side');
  });
});
