# Phase 1: データ修正 + 法務テキスト + 免責 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手首ストレッチの部位タグ誤りを直し、薬機法・景表法上リスクのある効果効能表現を全除去し、医療免責をアプリに明示する。

**Architecture:** データ（`src/data/stretches.ts`）と処方ロジック（`src/utils/prescription.ts`）のピンポイント修正＋免責定数（新規 `src/data/disclaimer.ts`）を Step1 と Settings に差し込む。UI構造は変えず、テキストと1部位タグのみ。

**Tech Stack:** TypeScript, React Native, Expo SDK 54, Jest + @testing-library/react-native。

**親仕様:** `docs/superpowers/specs/2026-05-24-pre-launch-hardening-design.md`（WS3・WS4）。

**前提:** ブランチ `pre-launch-hardening`（`origin/main` 起点）。`npx jest` がベースラインで89テスト緑であること。

---

### Task 1: 手首/指ストレッチの部位タグ修正 + 腕処方への組み込み（WS4）

**背景:** `wrist-flexor-stretch`(L508)・`wrist-extensor-stretch`(L521)・`finger-flexor-stretch`(L625) の `bodyParts` が誤って `['shoulder']`。`finger-extensor-stretch`(L914) は既に `['arm']` で正しい。さらに `getPrescription` は `BODY_PRESCRIPTION[bodyPart]` の明示idリストで処方するため、タグ修正だけでは「腕」選択時に手首ストレッチが処方されない。`BODY_PRESCRIPTION.arm` への追加も必要。

**Files:**
- Modify: `src/data/stretches.ts`（3箇所の `bodyParts`）
- Modify: `src/utils/prescription.ts:103`（`BODY_PRESCRIPTION.arm`）
- Test: `__tests__/data-integrity.test.ts`（新規）、`__tests__/prescription.test.ts`（追記）

- [ ] **Step 1: データ整合性テストを書く（失敗するはず）**

Create `__tests__/data-integrity.test.ts`:

```typescript
import { ALL_STRETCHES } from '../src/data/stretches';

describe('stretch bodyPart tags', () => {
  it('tags all wrist/finger stretches as arm, not shoulder', () => {
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
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx jest __tests__/data-integrity.test.ts`
Expected: FAIL（`wrist-flexor-stretch` などが `['shoulder']` のため）

- [ ] **Step 3: 3箇所のタグを修正**

`src/data/stretches.ts` の以下3つの stretch ブロックで `bodyParts: ['shoulder'],` を `bodyParts: ['arm'],` に変更する（`id` で対象を特定）：
- `id: 'wrist-flexor-stretch'`
- `id: 'wrist-extensor-stretch'`
- `id: 'finger-flexor-stretch'`

（`finger-extensor-stretch` は変更不要。）

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npx jest __tests__/data-integrity.test.ts`
Expected: PASS

- [ ] **Step 5: 腕処方に手首を含めるテストを追記（失敗するはず）**

`__tests__/prescription.test.ts` に追記：

```typescript
import { getPrescription } from '../src/utils/prescription';
import { ALL_STRETCHES } from '../src/data/stretches';

describe('arm prescription includes wrist care', () => {
  it('includes wrist stretches when arm is selected', () => {
    const { stretchIds } = getPrescription(ALL_STRETCHES, ['arm'], 'home');
    expect(stretchIds).toContain('wrist-extensor-stretch');
  });
});
```

- [ ] **Step 6: テストを実行して失敗を確認**

Run: `npx jest __tests__/prescription.test.ts -t 'arm prescription'`
Expected: FAIL（`BODY_PRESCRIPTION.arm` に手首がない）

- [ ] **Step 7: BODY_PRESCRIPTION.arm に手首を追加**

`src/utils/prescription.ts` の `BODY_PRESCRIPTION` の `arm` 行を変更：

```typescript
  arm:      ['bicep-wall-stretch', 'tricep-overhead-stretch', 'forearm-rotator-stretch', 'wrist-extensor-stretch', 'wrist-flexor-stretch'],
```

- [ ] **Step 8: テストを実行して成功を確認**

Run: `npx jest __tests__/prescription.test.ts`
Expected: PASS（既存の prescription テストも緑のまま）

- [ ] **Step 9: 全テスト確認 + コミット**

```bash
npx jest
git add src/data/stretches.ts src/utils/prescription.ts __tests__/data-integrity.test.ts __tests__/prescription.test.ts
git commit -m "fix: retag wrist/finger stretches as arm and add to arm prescription

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 効果効能表現の除去（WS3・薬機法/景表法）

**背景:** `descriptionJa` に断定的な効果効能表現（予防/解消/改善/効果/特効/血行促進/副交感/入眠の質）が31箇所残存。体験・用途の表現へ置換する。

**Files:**
- Test: `__tests__/legal-copy.test.ts`（新規）
- Modify: `src/data/stretches.ts`（31箇所の `descriptionJa`）

- [ ] **Step 1: 禁止語リグレッションテストを書く（失敗するはず）**

Create `__tests__/legal-copy.test.ts`:

```typescript
import { ALL_STRETCHES } from '../src/data/stretches';

// 効果の断定にあたる高リスク表現。descriptionJa から除去する。
const FORBIDDEN = ['予防', '解消', '改善', '効果', '特効', '血行促進', '副交感', '入眠の質', '促進', '即効'];

describe('descriptionJa avoids medical-claim wording', () => {
  for (const s of ALL_STRETCHES) {
    it(`${s.id} has no forbidden term`, () => {
      const hits = FORBIDDEN.filter((w) => s.descriptionJa.includes(w));
      expect(hits).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx jest __tests__/legal-copy.test.ts`
Expected: FAIL（31種で禁止語を検出）

- [ ] **Step 3: descriptionJa を置換**

`src/data/stretches.ts` で、各 `id` の `descriptionJa` を以下の「新」に置換する（`id` で対象ブロックを特定）。記載のない種目は変更しない。

| id | 新 descriptionJa |
|----|------------------|
| `shoulder-roll` | `肩を大きく回して肩甲骨まわりを動かし、肩の重だるさをやわらげたい時に。` |
| `neck-full` | `前後左右・回旋を含む首の総合ケア。首まわりの巡りと緊張がほぐれる感覚に。頸椎症・頸椎ヘルニアのある方は後屈を避け、痛みやしびれが出たら即中止してください。` |
| `shoulder-full` | `肩甲骨まわりを多角度からほぐす本格メニュー。肩の動かしにくさが気になる方に。` |
| `eye-neck-roll` | `目の疲れが気になる時に、首をゆっくり360度回して巡りを感じる。` |
| `ankle-rotation` | `座ったまま足首をゆっくり大きく回し、脚のむくみが気になる時のケアに。` |
| `chin-tuck` | `顎を真後ろに水平に引き、頸部深層筋を働かせる。ストレートネック・スマホ首が気になる方に。` |
| `levator-scapula-stretch` | `肩甲挙筋にやさしくアプローチし、首こり・肩こりの深部をほぐしたい時に。` |
| `pec-wall-stretch` | `壁に前腕をつけて体を回転させ、大胸筋・小胸筋をしっかり伸ばす。巻き肩・猫背が気になる方に。` |
| `piriformis-stretch` | `仰向けでフィギュア4のポーズを取り、梨状筋をゆるめる。坐骨神経痛が気になる長時間座位の方におすすめ。` |
| `diaphragm-breathing` | `腹部だけを使った横隔膜呼吸でゆっくり呼吸を整える。ひと息つきたい時・就寝前のリラックスに。` |
| `wrist-extensor-stretch` | `前腕伸筋群（橈側手根伸筋・指伸筋）と外側上顆の緊張をゆるめる。テニス・バドミントンのバックハンドや卓球のラケット操作後におすすめ。` |
| `sleeper-stretch` | `棘下筋・小円筋・後方関節包を伸ばす。オーバーヘッドスポーツで内旋がかたくなりやすい方に。投球・スパイク動作前後のケアに。` |
| `ankle-dorsiflexion-stretch` | `下腿三頭筋遠位と足関節の背屈可動域を広げたい時に。スクワットやジャンプ着地の動きづくりに使われる種目。` |
| `plantar-fascia-stretch` | `足底筋膜・足趾屈筋群を伸ばす。足裏の張りが気になる長時間歩行・登山・ダンスの後のケアに。` |
| `patellar-tendon-quad-stretch` | `大腿四頭筋遠位部と膝蓋腱を重点的に伸ばす。バスケ・バレーでジャンプ着地が多い方のケアに。` |
| `finger-flexor-stretch` | `浅指屈筋・深指屈筋とA2プーリー周辺の緊張をゆるめる。ボルダリング・クライミングで指を酷使する方のケアに。` |
| `cobra-sphinx-stretch` | `腹直筋を伸ばし、胸椎を心地よく反らす。サーフィンのテイクオフ姿勢・水泳のバタフライ・体操のバックベンド準備に。` |
| `neck-isometric-activation` | `頸部の屈筋・伸筋・側屈筋を等尺収縮で働かせる。ラグビーのスクラムや格闘技の接触前に首を安定させたい時のケアに。` |
| `standing-wall-hamstring` | `立位で足を壁に沿って高く上げ、ハムストリングスと脚の可動域を広げたい時に。格闘技のハイキックやダンスのレッグスイングの動きづくりに。` |
| `doorway-chest-stretch` | `ドアフレームに両手をついて体を前に倒し、大胸筋・小胸筋を深く伸ばす。デスクワークでの巻き肩が気になる方に。` |
| `dead-bug-stretch` | `仰向けで対角線上の腕と脚を同時に伸ばし、体幹の安定筋（腹横筋・多裂筋）を働かせる。腰まわりの安定と姿勢づくりの基礎種目。` |
| `neck-rotation-stretch` | `頸椎の回旋可動域を左右均等に整える。胸鎖乳突筋・頭板状筋の左右差をゆるめ、長時間のモニター作業による首の偏りをリセット。` |
| `standing-hip-flexor-reset` | `座り続けで縮こまった腸腰筋を、立ち上がりの動作でさっとリセット。1〜2分でできる、デスクワーカー向けの手軽なケア。` |
| `finger-extensor-stretch` | `指屈筋群と手掌腱膜の緊張をゆるめ、長時間のタイピングやスマホ操作でたまった手の疲れをほぐしたい時に。` |
| `morning-joint-mobility` | `起床直後に全身の主要関節を順番に動かし、一日のスタートを整えるやさしい準備体操。朝のこわばりが気になる時に。` |
| `morning-spine-mobilization` | `仰向けで脊椎の回旋と屈伸を行い、就寝中にこわばった背骨を目覚めさせる。腰まわりと姿勢のリセットを朝一番に行える簡単シーケンス。` |
| `bedtime-legs-up-wall` | `壁に脚を立てかけて仰向けになる逆転ポーズ。一日の歩行・立ち仕事による脚のむくみや疲れが気になる時のケアに。` |
| `bedtime-yin-hip` | `長時間のホールドで股関節の深層筋（外旋筋群・内転筋群）と結合組織をゆるめる。就寝前にゆったり過ごしたい時に。` |
| `bedtime-progressive-relaxation` | `頭から足先まで順番に各部位を意識してゆるめる。段階的に力を抜いて、深いリラックスと就寝前のひと息に。` |

注: 全 id は main の実データで確認済み。置換後、表に無い種目で禁止語が残る場合は、同じ置換方針（予防→「が気になる方に」、解消/改善→「ケアに/ほぐす/ゆるめる」、効果的/特効→「おすすめ」、血行促進/促進→「巡り」、副交感/入眠→「リラックス/就寝前のひと息」、即効→「手軽」）で個別修正する。

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npx jest __tests__/legal-copy.test.ts`
Expected: PASS（全種目で禁止語ゼロ）

- [ ] **Step 5: 全テスト確認 + コミット**

```bash
npx jest
git add src/data/stretches.ts __tests__/legal-copy.test.ts
git commit -m "fix: remove medical-claim wording from stretch descriptions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: グローバル医療免責の表示（WS3）

**背景:** アプリ全体の医療免責が存在しない。オンボ最初（Step1）に短縮版、Settings に常設フッターで全文を表示する。

**Files:**
- Create: `src/data/disclaimer.ts`
- Modify: `src/screens/onboarding/Step1BodyParts.tsx`（subtitle 直下に短縮版）
- Modify: `src/screens/SettingsScreen.tsx`（末尾にフッター）

- [ ] **Step 1: 免責定数を作成**

Create `src/data/disclaimer.ts`:

```typescript
export const DISCLAIMER_SHORT =
  '※本アプリは医療行為・診断ではありません。痛みや違和感を感じたらすぐ中止してください。';

export const DISCLAIMER_FULL =
  '本アプリが提供するストレッチは健康維持を目的とした一般的な情報であり、医療行為・診断・治療ではありません。痛みや持病・既往のある方、妊娠中の方は、実施前に医師にご相談ください。実施中に痛みや違和感を感じた場合はただちに中止してください。本アプリの利用により生じたいかなる結果についても、開発者は責任を負いかねます。';
```

- [ ] **Step 2: Step1 に短縮免責を表示**

`src/screens/onboarding/Step1BodyParts.tsx`:

import 追加（既存 import 群の下）:
```typescript
import { DISCLAIMER_SHORT } from '../../data/disclaimer';
```

`<Text style={styles.subtitle}>複数選択できます</Text>` の直後に追加:
```tsx
      <Text style={styles.disclaimer}>{DISCLAIMER_SHORT}</Text>
```

`styles` に追加:
```typescript
  disclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: 16, lineHeight: 16 },
```

- [ ] **Step 3: Settings にフッター免責を表示**

`src/screens/SettingsScreen.tsx`:

import 追加:
```typescript
import { DISCLAIMER_FULL } from '../data/disclaimer';
```

プロフィールセクションの閉じ `</View>`（`editableSection`）の直後、`</SafeAreaView>` の手前に追加:
```tsx
      <Text style={styles.disclaimer}>{DISCLAIMER_FULL}</Text>
```

`styles` に追加:
```typescript
  disclaimer: { fontSize: 11, color: Colors.textMuted, lineHeight: 17, marginTop: 28, marginBottom: 8 },
```

- [ ] **Step 4: 表示テストを書く（失敗するはず）**

Create `__tests__/screens/Step1Disclaimer.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import Step1BodyParts from '../../src/screens/onboarding/Step1BodyParts';
import { DISCLAIMER_SHORT } from '../../src/data/disclaimer';

it('shows the medical disclaimer on Step1', () => {
  const navigation = { navigate: jest.fn() } as any;
  const { getByText } = render(<Step1BodyParts navigation={navigation} />);
  expect(getByText(DISCLAIMER_SHORT)).toBeTruthy();
});
```

- [ ] **Step 5: テストを実行して成功を確認**

Run: `npx jest __tests__/screens/Step1Disclaimer.test.tsx`
Expected: PASS（Step 2 を実装済みのため。先に失敗を見たい場合は Step 2 を後回しにして確認）

- [ ] **Step 6: 全テスト確認 + コミット**

```bash
npx jest
git add src/data/disclaimer.ts src/screens/onboarding/Step1BodyParts.tsx src/screens/SettingsScreen.tsx __tests__/screens/Step1Disclaimer.test.tsx
git commit -m "feat: add global medical disclaimer to onboarding and settings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage（WS3/WS4）:**
- WS4 手首タグ → Task 1 ✓（タグ修正＋arm処方＋テスト）
- WS3 効果効能表現除去 → Task 2 ✓（31箇所置換＋禁止語リグレッション）
- WS3 グローバル免責 → Task 3 ✓（Step1短縮＋Settings全文）
- WS3 `shoulder-roll` 平易化 → Task 2 表に含む ✓
- WS3 秒数矛盾スイープ → **本Phaseに明示タスクなし**。main の全種目に対する秒数矛盾の網羅確認は Phase 2 着手前に別途スイープ（`descriptionJa` の秒数 vs `steps` の秒数を目視/スクリプト照合）。Phase 1 のスコープからは外し、ここに記録。
- WS3 privacy policy リンク → ホスティングURL未定のため本Phase除外（URL確定後に Settings 行追加）。spec の该当を後続に繰り越し。

**Placeholder scan:** なし（全 step に実コード/実コマンド）。`seated-neck-rotation` 等の推定 id は Step 3 注記で本文一致による特定を明記。

**Type consistency:** `DISCLAIMER_SHORT`/`DISCLAIMER_FULL` は Task 3 Step 1 で定義し Step 2/3/4 で同名参照。`getPrescription(stretches, bodyParts, scene)` の引数順は既存 `src/utils/prescription.ts` と一致。

**留意:** Task 2 Step 3 は `id` で対象ブロックを特定して置換する。全 id は main 実データで確認済み。`npx jest __tests__/legal-copy.test.ts` が緑になることで漏れを最終担保する。
