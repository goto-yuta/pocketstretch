import { ALL_STRETCHES } from '../src/data/stretches';

// 効果の断定にあたる高リスク表現。nameJa / descriptionJa / steps から除去する。
const FORBIDDEN = [
  '予防',
  '解消',
  '改善',
  '効果',
  '特効',
  '血行促進',
  '副交感',
  '入眠の質',
  '促進',
  '即効',
  '緩和',
  '根本',
  '原因',
  '促す',
  '解放',
  '必須',
];

describe('descriptionJa avoids medical-claim wording', () => {
  for (const s of ALL_STRETCHES) {
    it(`${s.id} has no forbidden term`, () => {
      const text = `${s.nameJa} ${s.descriptionJa} ${s.steps.join(' ')}`;
      const hits = FORBIDDEN.filter((w) => text.includes(w));
      expect(hits).toEqual([]);
    });
  }
});
