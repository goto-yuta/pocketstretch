import { BodyPart, DurationFilter, Goal, Scene, Stretch } from '../types';

interface FilterOptions {
  scene?: Scene;
  bodyParts?: BodyPart[];
}

export function filterStretches(stretches: Stretch[], options: FilterOptions): Stretch[] {
  return stretches.filter((s) => {
    if (options.scene && !s.scenes.includes(options.scene)) return false;
    if (options.bodyParts?.length && !options.bodyParts.some((bp) => s.bodyParts.includes(bp))) return false;
    return true;
  });
}

export function getRecommended(stretches: Stretch[], bodyParts: BodyPart[], scene: Scene): Stretch[] {
  const scored = stretches
    .filter((s) => s.scenes.includes(scene) || s.bodyParts.some((bp) => bodyParts.includes(bp)))
    .map((s) => ({
      stretch: s,
      score:
        (s.scenes.includes(scene) ? 1 : 0) +
        s.bodyParts.filter((bp) => bodyParts.includes(bp)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.stretch);
}

interface GoalFilterConfig {
  bodyParts?: BodyPart[];
  maxDifficulty?: 1 | 2 | 3;
  minDifficulty?: 1 | 2 | 3;
  scenes?: Scene[];
}

const GOAL_FILTER_MAP: Record<Goal, GoalFilterConfig> = {
  'shoulder-stiffness': { bodyParts: ['shoulder', 'neck'] },
  'neck-stiffness': { bodyParts: ['neck'] },
  'lower-back-pain': { bodyParts: ['back'] },
  'drowsiness': { bodyParts: ['neck', 'shoulder'], maxDifficulty: 2 },
  'eye-strain': { bodyParts: ['neck'] },
  'leg-swelling': { bodyParts: ['leg', 'hip'] },
  'relax': { maxDifficulty: 2 },
  'focus': { bodyParts: ['neck', 'shoulder'], scenes: ['office', 'home'] },
  'warmup': { minDifficulty: 2 },
  'cooldown': { maxDifficulty: 2 },
  'mood-change': {},
  'morning': { scenes: ['home', 'serious'], maxDifficulty: 2 },
  'bedtime': { scenes: ['home', 'serious'], maxDifficulty: 1 },
};

const DURATION_SECONDS: Record<DurationFilter, number> = {
  '3min': 180,
  '5min': 300,
  '10min': 600,
  'any': Infinity,
};

export function filterByGoals(stretches: Stretch[], goals: Goal[]): Stretch[] {
  if (goals.length === 0) return stretches;

  const mergedBodyParts = new Set<BodyPart>();
  const mergedScenes = new Set<Scene>();
  let maxDifficulty: number | undefined;
  let minDifficulty: number | undefined;

  for (const goal of goals) {
    const config = GOAL_FILTER_MAP[goal];
    config.bodyParts?.forEach((bp) => mergedBodyParts.add(bp));
    config.scenes?.forEach((sc) => mergedScenes.add(sc));
    if (config.maxDifficulty !== undefined) {
      maxDifficulty = maxDifficulty === undefined ? config.maxDifficulty : Math.min(maxDifficulty, config.maxDifficulty);
    }
    if (config.minDifficulty !== undefined) {
      minDifficulty = minDifficulty === undefined ? config.minDifficulty : Math.max(minDifficulty, config.minDifficulty);
    }
  }

  return stretches.filter((s) => {
    if (mergedBodyParts.size > 0 && !s.bodyParts.some((bp) => mergedBodyParts.has(bp))) return false;
    if (maxDifficulty !== undefined && s.difficulty > maxDifficulty) return false;
    if (minDifficulty !== undefined && s.difficulty < minDifficulty) return false;
    if (mergedScenes.size > 0 && !s.scenes.some((sc) => mergedScenes.has(sc))) return false;
    return true;
  });
}

export function applyDurationFilter(stretches: Stretch[], duration: DurationFilter): Stretch[] {
  const limit = DURATION_SECONDS[duration];
  let total = 0;
  const result: Stretch[] = [];
  for (const s of stretches) {
    if (total + s.durationSeconds <= limit) {
      result.push(s);
      total += s.durationSeconds;
    }
  }
  return result;
}
