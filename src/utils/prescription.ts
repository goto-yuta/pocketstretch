import { BodyPart, Scene, Stretch } from '../types';

export interface Prescription {
  stretchIds: string[];
  totalMinutes: number;
  label: string;
}

export const SPORT_LABEL: Record<string, string> = {
  running: 'ランニング',
  golf: 'ゴルフ',
  tennis: 'テニス',
  swimming: '水泳',
  cycling: 'サイクリング',
  weighttraining: '筋トレ',
  soccer: 'サッカー',
  baseball: '野球',
  basketball: 'バスケ',
  badminton: 'バドミントン',
  yoga: 'ヨガ',
  hiking: '登山',
  volleyball: 'バレー',
  'martial-arts': '格闘技',
  skiing: 'スキー',
  tabletennis: '卓球',
  dance: 'ダンス',
  climbing: 'クライミング',
  rugby: 'ラグビー',
  surfing: 'サーフィン',
  'road-cycling': '自転車競技',
  gymnastics: '体操',
};

export const SPORT_SUGGESTIONS: Array<{ key: string; label: string }> = Object.entries(SPORT_LABEL).map(
  ([key, label]) => ({ key, label }),
);

const SPORT_ALIASES: Record<string, string[]> = {
  running: ['ランニング', 'ジョギング', 'マラソン', 'running', 'jogging', 'marathon'],
  golf: ['ゴルフ', 'golf'],
  tennis: ['テニス', 'tennis'],
  swimming: ['水泳', 'スイミング', 'swimming'],
  cycling: ['サイクリング', 'cycling'],
  weighttraining: ['筋トレ', 'ウエイトトレーニング', '筋力トレーニング', 'weight training', 'gym', 'ジム'],
  soccer: ['サッカー', 'フットボール', 'soccer', 'football'],
  baseball: ['野球', 'ソフトボール', 'baseball', 'softball'],
  basketball: ['バスケットボール', 'バスケ', 'basketball'],
  badminton: ['バドミントン', 'badminton'],
  yoga: ['ヨガ', 'yoga'],
  hiking: ['登山', 'ハイキング', 'トレッキング', 'hiking', 'mountaineering', 'trekking'],
  volleyball: ['バレーボール', 'バレー', 'volleyball'],
  'martial-arts': ['格闘技', '武道', '空手', '柔道', '柔術', '剣道', 'martial arts', 'karate', 'judo', 'bjj'],
  skiing: ['スキー', 'スノーボード', 'skiing', 'snowboard', 'snowboarding'],
  tabletennis: ['卓球', 'table tennis', 'ping pong', 'ピンポン'],
  dance: ['ダンス', 'ヒップホップ', 'バレエ', 'dance', 'ballet', 'hip hop'],
  climbing: ['クライミング', 'ボルダリング', 'climbing', 'bouldering'],
  rugby: ['ラグビー', 'rugby'],
  surfing: ['サーフィン', '水上スポーツ', 'サップ', 'surfing', 'sup', 'paddleboarding'],
  'road-cycling': ['自転車競技', 'ロードレース', 'ロードバイク', 'road cycling', 'road bike', '自転車'],
  gymnastics: ['体操', '新体操', '器械体操', 'gymnastics', 'rhythmic gymnastics'],
};

const SPORT_PRESCRIPTION: Record<string, string[]> = {
  running: ['iliopsoas-stretch', 'hamstring', 'it-band-stretch', 'calf', 'piriformis-stretch'],
  golf: ['thoracic-open-book', 'spinal-twist', 'quadratus-lumborum-stretch', 'shoulder-cross', 'wrist-flexor-stretch'],
  tennis: ['sleeper-stretch', 'wrist-extensor-stretch', 'shoulder-cross', 'adductor-stretch', 'calf'],
  swimming: ['shoulder-full', 'pec-wall-stretch', 'lat-stretch', 'thoracic-open-book', 'ankle-plantar-flexion-stretch'],
  cycling: ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'quadratus-lumborum-stretch'],
  weighttraining: ['cat-cow', 'thoracic-open-book', 'pec-wall-stretch', 'lat-stretch', 'ankle-dorsiflexion-stretch'],
  soccer: ['adductor-stretch', 'hamstring', 'iliopsoas-stretch', 'calf', 'pigeon'],
  baseball: ['sleeper-stretch', 'shoulder-cross', 'thoracic-open-book', 'wrist-flexor-stretch', 'pigeon'],
  basketball: ['calf', 'quad-stretch', 'ankle-dorsiflexion-stretch', 'hamstring', 'patellar-tendon-quad-stretch'],
  badminton: ['shoulder-full', 'sleeper-stretch', 'calf', 'adductor-stretch', 'wrist-extensor-stretch'],
  yoga: ['cat-cow', 'pigeon', 'butterfly', 'child-pose', 'diaphragm-breathing'],
  hiking: ['quad-stretch', 'calf', 'it-band-stretch', 'piriformis-stretch', 'plantar-fascia-stretch'],
  volleyball: ['shoulder-full', 'pec-wall-stretch', 'calf', 'sleeper-stretch', 'patellar-tendon-quad-stretch'],
  'martial-arts': ['butterfly', 'adductor-stretch', 'pigeon', 'neck-isometric-activation', 'standing-wall-hamstring'],
  skiing: ['quad-stretch', 'adductor-stretch', 'iliopsoas-stretch', 'tibialis-anterior-stretch', 'ankle-dorsiflexion-stretch'],
  tabletennis: ['wrist-flexor-stretch', 'wrist-extensor-stretch', 'levator-scapula-stretch', 'quadratus-lumborum-stretch', 'adductor-stretch'],
  dance: ['butterfly', 'pigeon', 'hamstring', 'thoracic-open-book', 'plantar-fascia-stretch'],
  climbing: ['wrist-flexor-stretch', 'finger-flexor-stretch', 'lat-stretch', 'shoulder-cross', 'pigeon'],
  rugby: ['neck-isometric-activation', 'hamstring', 'adductor-stretch', 'iliopsoas-stretch', 'pec-wall-stretch'],
  surfing: ['cobra-sphinx-stretch', 'thoracic-extension', 'pec-wall-stretch', 'pigeon', 'shoulder-flexion-overhead-stretch'],
  'road-cycling': ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'wrist-flexor-stretch'],
  gymnastics: ['split-prep-stretch', 'thoracic-extension', 'butterfly', 'shoulder-flexion-overhead-stretch', 'ankle-plantar-flexion-stretch'],
};

export function normalizeSport(input: string): string | null {
  if (!input.trim()) return null;
  const normalized = input.trim().toLowerCase();
  // Pass 1: exact match
  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === normalized)) return key;
  }
  // Pass 2: partial includes match
  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a.toLowerCase()) || a.toLowerCase().includes(normalized))) return key;
  }
  return null;
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
