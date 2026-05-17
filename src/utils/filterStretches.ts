import { BodyPart, Scene, Stretch } from '../types';

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
