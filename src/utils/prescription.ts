import { BodyPart, Scene, Stretch } from '../types';

export interface Prescription {
  stretchIds: string[];
  totalMinutes: number;
  label: string;
}

const BODY_PRESCRIPTION: Record<BodyPart, string[]> = {
  neck:     ['chin-tuck', 'levator-scapula-stretch', 'neck-side'],
  shoulder: ['pec-wall-stretch', 'thoracic-open-book', 'chest-open'],
  back:     ['thoracic-open-book', 'cat-cow', 'quadratus-lumborum-stretch'],
  hip:      ['piriformis-stretch', 'iliopsoas-stretch', 'butterfly'],
  leg:      ['hamstring', 'calf', 'it-band-stretch'],
};

const BODY_LABEL: Record<BodyPart, string> = {
  neck:     '首こり',
  shoulder: '肩こり',
  back:     '腰痛ケア',
  hip:      '股関節ケア',
  leg:      '脚ケア',
};

export function getPrescription(
  stretches: Stretch[],
  bodyParts: BodyPart[],
  scene: Scene,
): Prescription {
  if (bodyParts.length === 0) {
    return { stretchIds: [], totalMinutes: 0, label: '' };
  }

  const stretchMap = new Map(stretches.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const stretchIds: string[] = [];

  for (const bp of bodyParts) {
    for (const id of BODY_PRESCRIPTION[bp]) {
      if (seen.has(id)) continue;
      const stretch = stretchMap.get(id);
      if (!stretch) continue;
      if (!stretch.scenes.includes(scene)) continue;
      seen.add(id);
      stretchIds.push(id);
    }
  }

  const totalSeconds = stretchIds.reduce((sum, id) => {
    const s = stretchMap.get(id);
    return s ? sum + s.durationSeconds * s.recommendedSets : sum;
  }, 0);

  const label = bodyParts.map((bp) => BODY_LABEL[bp]).join(' + ');

  return { stretchIds, totalMinutes: Math.ceil(totalSeconds / 60), label };
}

export function getCompletedMinutes(
  completedStretchIds: string[],
  prescriptionStretchIds: string[],
  allStretches: Stretch[],
): number {
  const stretchMap = new Map(allStretches.map((s) => [s.id, s]));
  const completedSet = new Set(completedStretchIds);
  const totalSeconds = prescriptionStretchIds
    .filter((id) => completedSet.has(id))
    .reduce((sum, id) => {
      const s = stretchMap.get(id);
      return s ? sum + s.durationSeconds * s.recommendedSets : sum;
    }, 0);
  return Math.ceil(totalSeconds / 60);
}

export function getSessionStretchIds(
  prescription: Prescription,
  completedStretchIds: string[],
  allStretches: Stretch[],
): string[] {
  const stretchMap = new Map(allStretches.map((s) => [s.id, s]));
  const completedSet = new Set(completedStretchIds);
  const result: string[] = [];

  for (const id of prescription.stretchIds) {
    if (completedSet.has(id)) continue;
    const stretch = stretchMap.get(id);
    if (!stretch) continue;
    for (let i = 0; i < stretch.recommendedSets; i++) {
      result.push(id);
    }
  }
  return result;
}
