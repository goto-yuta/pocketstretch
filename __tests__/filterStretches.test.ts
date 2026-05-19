import { ALL_STRETCHES } from '../src/data/stretches';
import { filterStretches, getRecommended, filterByGoals, applyDurationFilter } from '../src/utils/filterStretches';
import { Stretch, Goal, DurationFilter } from '../src/types';

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

const mockForGoals: Stretch[] = [
  { id: 'a', nameJa: 'A', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'b', nameJa: 'B', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 2, bodyParts: ['shoulder'], scenes: ['home'], steps: [] },
  { id: 'c', nameJa: 'C', descriptionJa: '', image: 0, durationSeconds: 45, difficulty: 3, bodyParts: ['leg'], scenes: ['serious'], steps: [] },
  { id: 'd', nameJa: 'D', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 1, bodyParts: ['back'], scenes: ['home'], steps: [] },
  { id: 'e', nameJa: 'E', descriptionJa: '', image: 0, durationSeconds: 50, difficulty: 2, bodyParts: ['hip'], scenes: ['home'], steps: [] },
];

describe('filterByGoals', () => {
  it('returns all stretches when goals is empty', () => {
    expect(filterByGoals(mockForGoals, [])).toHaveLength(5);
  });

  it('filters by bodyPart for neck-stiffness', () => {
    const result = filterByGoals(mockForGoals, ['neck-stiffness']);
    expect(result.map(s => s.id)).toEqual(['a']);
  });

  it('merges bodyParts across multiple goals (OR)', () => {
    // shoulder-stiffness = neck|shoulder, neck-stiffness = neck → union = neck|shoulder
    const result = filterByGoals(mockForGoals, ['shoulder-stiffness', 'neck-stiffness']);
    expect(result.map(s => s.id).sort()).toEqual(['a', 'b']);
  });

  it('applies maxDifficulty for relax', () => {
    // relax: maxDifficulty 2 → excludes c (difficulty 3)
    const result = filterByGoals(mockForGoals, ['relax']);
    expect(result.map(s => s.id)).not.toContain('c');
  });

  it('applies minDifficulty for warmup', () => {
    // warmup: minDifficulty 2 → excludes a (difficulty 1), d (difficulty 1)
    const result = filterByGoals(mockForGoals, ['warmup']);
    expect(result.map(s => s.id)).not.toContain('a');
    expect(result.map(s => s.id)).not.toContain('d');
  });

  it('returns all for mood-change (no constraints)', () => {
    expect(filterByGoals(mockForGoals, ['mood-change'])).toHaveLength(5);
  });
});

const mockForDuration: Stretch[] = [
  { id: 'x', nameJa: 'X', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'y', nameJa: 'Y', descriptionJa: '', image: 0, durationSeconds: 90, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'z', nameJa: 'Z', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
];

describe('applyDurationFilter', () => {
  it('returns all for "any"', () => {
    expect(applyDurationFilter(mockForDuration, 'any')).toHaveLength(3);
  });

  it('stops adding when cumulative seconds would exceed limit', () => {
    // 3min = 180s: x(60) + y(90) = 150 ≤ 180, + z(60) = 210 > 180 → [x, y]
    const result = applyDurationFilter(mockForDuration, '3min');
    expect(result.map(s => s.id)).toEqual(['x', 'y']);
  });

  it('returns empty for empty input', () => {
    expect(applyDurationFilter([], '5min')).toHaveLength(0);
  });

  it('skips stretches that do not fit but continues checking shorter ones', () => {
    const mixed: Stretch[] = [
      { id: 'big', nameJa: 'big', descriptionJa: '', image: 0, durationSeconds: 200, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
      { id: 'small', nameJa: 'small', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
    ];
    // 3min=180s: big(200) > 180 → skip, small(60) ≤ 180 → include
    const result = applyDurationFilter(mixed, '3min');
    expect(result.map(s => s.id)).toEqual(['small']);
  });
});
