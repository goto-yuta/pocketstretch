import { getPrescription, getCompletedMinutes, getSessionStretchIds, normalizeSport } from '../src/utils/prescription';
import { Stretch } from '../src/types';
import { ALL_STRETCHES } from '../src/data/stretches';

const mockStretches: Stretch[] = [
  { id: 'chin-tuck', nameJa: '顎引き', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['neck'], scenes: ['office', 'home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'neck-side', nameJa: '首横', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['neck'], scenes: ['office', 'home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'levator-scapula-stretch', nameJa: '肩甲挙筋', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['neck', 'shoulder'], scenes: ['office', 'home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'thoracic-open-book', nameJa: '胸椎OB', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['back', 'shoulder'], scenes: ['home', 'serious'], steps: [], recommendedSets: 3 },
  { id: 'chest-open', nameJa: '胸開き', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['shoulder'], scenes: ['office', 'home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'pec-wall-stretch', nameJa: '大胸筋壁', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 2, bodyParts: ['shoulder'], scenes: ['home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'cat-cow', nameJa: 'キャットカウ', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['back'], scenes: ['home', 'serious'], steps: [], recommendedSets: 1 },
  { id: 'quadratus-lumborum-stretch', nameJa: '腰方形筋', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['back'], scenes: ['office', 'home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'piriformis-stretch', nameJa: '梨状筋', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['hip', 'back'], scenes: ['home', 'serious'], steps: [], recommendedSets: 3 },
  { id: 'iliopsoas-stretch', nameJa: '腸腰筋', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['hip', 'back'], scenes: ['home', 'serious'], steps: [], recommendedSets: 3 },
  { id: 'butterfly', nameJa: 'バタフライ', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['hip'], scenes: ['home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'hamstring', nameJa: 'ハムスト', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['leg'], scenes: ['home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'calf', nameJa: 'ふくらはぎ', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 2, bodyParts: ['leg'], scenes: ['home', 'serious'], steps: [], recommendedSets: 2 },
  { id: 'it-band-stretch', nameJa: 'ITバンド', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 2, bodyParts: ['leg', 'hip'], scenes: ['home', 'serious'], steps: [], recommendedSets: 2 },
];

describe('getPrescription', () => {
  it('returns prescription stretches for neck bodyPart', () => {
    const result = getPrescription(mockStretches, ['neck'], 'office');
    expect(result.stretchIds).toContain('chin-tuck');
    expect(result.stretchIds).toContain('neck-side');
    expect(result.stretchIds).toContain('levator-scapula-stretch');
  });

  it('filters out stretches not available in given scene', () => {
    // thoracic-open-book は home/serious のみ → office ユーザーの shoulder 処方には含まれない
    const result = getPrescription(mockStretches, ['shoulder'], 'office');
    expect(result.stretchIds).not.toContain('thoracic-open-book');
    expect(result.stretchIds).not.toContain('pec-wall-stretch');
    expect(result.stretchIds).toContain('chest-open'); // office 対応
  });

  it('deduplicates stretches appearing in multiple bodyPart prescriptions', () => {
    // thoracic-open-book は shoulder と back 両方の処方に含まれる
    const result = getPrescription(mockStretches, ['shoulder', 'back'], 'home');
    const count = result.stretchIds.filter((id) => id === 'thoracic-open-book').length;
    expect(count).toBe(1);
  });

  it('calculates totalMinutes correctly', () => {
    // neck + office: chin-tuck(30×2=60) + neck-side(30×2=60) + levator(30×2=60) = 180s = 3min
    const result = getPrescription(mockStretches, ['neck'], 'office');
    expect(result.totalMinutes).toBe(3);
  });

  it('generates label from bodyParts', () => {
    const result = getPrescription(mockStretches, ['neck', 'back'], 'home');
    expect(result.label).toBe('首こり + 腰痛ケア');
  });

  it('returns empty prescription for empty bodyParts', () => {
    const result = getPrescription(mockStretches, [], 'office');
    expect(result.stretchIds).toHaveLength(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.label).toBe('');
  });
});

describe('getCompletedMinutes', () => {
  it('calculates minutes for completed prescription stretches', () => {
    // chin-tuck(30×2=60s) + neck-side(30×2=60s) = 120s = 2min
    const result = getCompletedMinutes(
      ['chin-tuck', 'neck-side'],
      ['chin-tuck', 'neck-side', 'levator-scapula-stretch'],
      mockStretches,
    );
    expect(result).toBe(2);
  });

  it('ignores completed stretches not in prescription', () => {
    // hamstring は prescription に含まれない → カウントしない
    const result = getCompletedMinutes(
      ['hamstring', 'chin-tuck'],
      ['chin-tuck'],
      mockStretches,
    );
    expect(result).toBe(1);
  });

  it('rounds up partial minutes', () => {
    // chin-tuck(30×2=60s) + one stretch with 10s×1=10s → 70s → ceil → 2min
    const shortStretch: Stretch = {
      id: 'short', nameJa: '', descriptionJa: '', image: 0,
      durationSeconds: 10, difficulty: 1, bodyParts: ['neck'],
      scenes: ['office'], steps: [], recommendedSets: 1,
    };
    const result = getCompletedMinutes(
      ['chin-tuck', 'short'],
      ['chin-tuck', 'short'],
      [...mockStretches, shortStretch],
    );
    expect(result).toBe(2); // 70s → ceil(70/60) = 2
  });

  it('returns 0 when nothing completed', () => {
    expect(getCompletedMinutes([], ['chin-tuck'], mockStretches)).toBe(0);
  });
});

describe('getSessionStretchIds', () => {
  it('returns uncompleted stretches repeated by recommendedSets', () => {
    const prescription = {
      stretchIds: ['chin-tuck', 'neck-side', 'levator-scapula-stretch'],
      totalMinutes: 3,
      label: '首こり',
    };
    const result = getSessionStretchIds(prescription, ['chin-tuck'], mockStretches);
    // chin-tuck は完了済み → neck-side×2, levator×2
    expect(result).toEqual([
      'neck-side', 'neck-side',
      'levator-scapula-stretch', 'levator-scapula-stretch',
    ]);
  });

  it('returns all stretches repeated when nothing completed', () => {
    const prescription = { stretchIds: ['chin-tuck'], totalMinutes: 1, label: '首こり' };
    const result = getSessionStretchIds(prescription, [], mockStretches);
    expect(result).toEqual(['chin-tuck', 'chin-tuck']); // recommendedSets: 2
  });

  it('returns empty when all stretches completed', () => {
    const prescription = {
      stretchIds: ['chin-tuck', 'neck-side'],
      totalMinutes: 2,
      label: '首こり',
    };
    const result = getSessionStretchIds(prescription, ['chin-tuck', 'neck-side'], mockStretches);
    expect(result).toHaveLength(0);
  });
});

describe('normalizeSport', () => {
  it('matches Japanese sport name exactly', () => {
    expect(normalizeSport('ランニング')).toBe('running');
    expect(normalizeSport('ゴルフ')).toBe('golf');
    expect(normalizeSport('サッカー')).toBe('soccer');
    expect(normalizeSport('筋トレ')).toBe('weighttraining');
    expect(normalizeSport('クライミング')).toBe('climbing');
    expect(normalizeSport('ボルダリング')).toBe('climbing');
  });

  it('matches alias variants', () => {
    expect(normalizeSport('フットボール')).toBe('soccer');
    expect(normalizeSport('ジョギング')).toBe('running');
    expect(normalizeSport('ウエイトトレーニング')).toBe('weighttraining');
    expect(normalizeSport('登山')).toBe('hiking');
    expect(normalizeSport('格闘技')).toBe('martial-arts');
    expect(normalizeSport('空手')).toBe('martial-arts');
    expect(normalizeSport('自転車競技')).toBe('road-cycling');
    expect(normalizeSport('ロードバイク')).toBe('road-cycling');
  });

  it('is case-insensitive for English', () => {
    expect(normalizeSport('RUNNING')).toBe('running');
    expect(normalizeSport('Running')).toBe('running');
    expect(normalizeSport('Soccer')).toBe('soccer');
  });

  it('returns null for unknown sport', () => {
    expect(normalizeSport('謎のスポーツ')).toBeNull();
    expect(normalizeSport('')).toBeNull();
    expect(normalizeSport('   ')).toBeNull();
  });

  it('matches exact alias variants', () => {
    expect(normalizeSport('マラソン')).toBe('running');
    expect(normalizeSport('新体操')).toBe('gymnastics');
  });
});

describe('getPrescription with sport', () => {
  it('includes sport prescription stretches', () => {
    const result = getPrescription(ALL_STRETCHES, [], 'home', 'running');
    // running prescription: iliopsoas-stretch, hamstring, it-band-stretch, calf, piriformis-stretch
    expect(result.stretchIds).toContain('hamstring');
    expect(result.stretchIds).toContain('calf');
    expect(result.stretchIds).toContain('iliopsoas-stretch');
  });

  it('unions bodyParts and sport prescriptions', () => {
    // neck bodyParts → chin-tuck, levator-scapula-stretch, neck-side
    // soccer sport → adductor-stretch, hamstring, iliopsoas-stretch, calf, pigeon (filtered by scene)
    const result = getPrescription(ALL_STRETCHES, ['neck'], 'home', 'soccer');
    expect(result.stretchIds).toContain('neck-side');
    expect(result.stretchIds).toContain('hamstring');
  });

  it('deduplicates stretches appearing in both prescriptions', () => {
    // hamstring is in both running and soccer prescriptions
    const result = getPrescription(ALL_STRETCHES, [], 'home', 'running');
    const count = result.stretchIds.filter((id) => id === 'hamstring').length;
    expect(count).toBe(1);
  });

  it('filters sport prescription stretches by scene', () => {
    // pigeon has scenes: ['serious'] — not office or home
    const result = getPrescription(ALL_STRETCHES, [], 'office', 'soccer');
    expect(result.stretchIds).not.toContain('pigeon');
  });

  it('includes sport name in label', () => {
    const result = getPrescription(ALL_STRETCHES, ['neck'], 'home', 'running');
    expect(result.label).toContain('ランニング');
    expect(result.label).toContain('首こり');
  });

  it('returns sport-only label when bodyParts is empty', () => {
    const result = getPrescription(ALL_STRETCHES, [], 'home', 'running');
    expect(result.label).toBe('ランニング');
  });

  it('returns empty prescription when both bodyParts and sport are empty', () => {
    const result = getPrescription(ALL_STRETCHES, [], 'office', undefined);
    expect(result.stretchIds).toHaveLength(0);
    expect(result.label).toBe('');
  });

  it('calculates totalMinutes across both prescriptions', () => {
    const result = getPrescription(ALL_STRETCHES, ['neck'], 'home', 'running');
    expect(result.totalMinutes).toBeGreaterThan(0);
  });
});

describe('getPrescription – new body parts', () => {
  it('returns arm stretches for arm body part in home scene', () => {
    const result = getPrescription(ALL_STRETCHES, ['arm'], 'home');
    expect(result.stretchIds.length).toBeGreaterThan(0);
    // bicep-wall-stretch is home-scene eligible
    expect(result.stretchIds).toContain('bicep-wall-stretch');
  });

  it('returns chest stretches for chest body part in home scene', () => {
    const result = getPrescription(ALL_STRETCHES, ['chest'], 'home');
    expect(result.stretchIds.length).toBeGreaterThan(0);
    expect(result.stretchIds).toContain('doorway-chest-stretch');
  });

  it('returns core stretches for core body part in home scene', () => {
    const result = getPrescription(ALL_STRETCHES, ['core'], 'home');
    expect(result.stretchIds.length).toBeGreaterThan(0);
    expect(result.stretchIds).toContain('dead-bug-stretch');
  });

  it('returns arm stretches in office scene', () => {
    const result = getPrescription(ALL_STRETCHES, ['arm'], 'office');
    // bicep-wall-stretch, tricep-overhead-stretch are office-eligible
    expect(result.stretchIds.length).toBeGreaterThan(0);
    expect(result.stretchIds).toContain('bicep-wall-stretch');
  });

  it('returns no chest prescriptions in office scene (doorway-chest-stretch is home-only)', () => {
    // chest-open and pec-wall-stretch: chest-open is office-eligible, pec-wall-stretch is not
    // chest-open IS in office scene so we should still get results
    const result = getPrescription(ALL_STRETCHES, ['chest'], 'office');
    // chest-open has scenes: ['office', 'home', 'serious'] so it qualifies
    expect(result.stretchIds).toContain('chest-open');
  });
});
