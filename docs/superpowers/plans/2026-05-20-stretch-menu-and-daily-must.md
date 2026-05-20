# Stretch Menu Expansion + Daily Must Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 13種の新ストレッチ追加・既存7箇所の説明修正を行い、ユーザーのbodyPartsに基づく「今日のマスト」処方カードをHomeScreen最上部に表示する。

**Architecture:** `Stretch`型に`recommendedSets`を追加し、`src/utils/prescription.ts`でbodyParts→処方ロジックを実装。`useUserStore`に日またぎリセット付きの`dailyProgress`を追加。`DailyMustCard`コンポーネントが処方と進捗を表示し、「残りXminやる」セッションを起動する。

**Tech Stack:** React Native (Expo 54), TypeScript, Zustand, @testing-library/react-native, Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | `Stretch`型に`recommendedSets`追加、`Completion`ルートパラメータ追加 |
| `src/data/stretches.ts` | Modify | 全25種に`recommendedSets`設定、7箇所修正、13種追加 |
| `src/utils/prescription.ts` | Create | `getPrescription` / `getCompletedMinutes` / `getSessionStretchIds` |
| `src/store/useUserStore.ts` | Modify | `dailyProgress`フィールドと`markStretchesCompleted`追加 |
| `src/screens/SessionScreen.tsx` | Modify | 完了時に重複IDを保持しつつCompletionへstretchIds渡す |
| `src/screens/CompletionScreen.tsx` | Modify | 受け取ったstretchIdsで`markStretchesCompleted`呼び出し |
| `src/components/DailyMustCard.tsx` | Create | 処方カードUI（進捗バー・チェックリスト・セッション開始ボタン） |
| `src/screens/HomeScreen.tsx` | Modify | 「今日のおすすめ」削除、`DailyMustCard`を最上部に追加 |
| `__tests__/prescription.test.ts` | Create | `prescription.ts`のユニットテスト |
| `__tests__/useUserStore.test.ts` | Modify | `dailyProgress`・`markStretchesCompleted`のテスト追加 |
| `__tests__/filterStretches.test.ts` | Modify | モックストレッチに`recommendedSets`フィールド追加 |

---

## Task 1: `Stretch`型に`recommendedSets`追加 + テストモック更新

**Files:**
- Modify: `src/types/index.ts`
- Modify: `__tests__/filterStretches.test.ts`

- [ ] **Step 1: `Stretch`型と`Completion`パラメータを更新**

`src/types/index.ts` を以下に変更：

```typescript
export type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg';
export type Scene = 'office' | 'home' | 'serious';

export interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: number;
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];
  recommendedSets: 1 | 2 | 3;
}

export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  notificationEnabled: boolean;
  notificationTimes: string[];
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
};

export type OnboardingStackParamList = {
  Step1: undefined;
  Step2: undefined;
  Step3: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type Goal =
  | 'shoulder-stiffness'
  | 'neck-stiffness'
  | 'lower-back-pain'
  | 'drowsiness'
  | 'eye-strain'
  | 'leg-swelling'
  | 'relax'
  | 'focus'
  | 'warmup'
  | 'cooldown'
  | 'mood-change';

export type DurationFilter = '3min' | '5min' | '10min' | 'any';
```

- [ ] **Step 2: テストモックに`recommendedSets`を追加**

`__tests__/filterStretches.test.ts` の全モックストレッチに `recommendedSets: 1` を追加。ファイル冒頭の`mockStretches`を以下に更新：

```typescript
const mockStretches: Stretch[] = [
  {
    id: 'a', nameJa: 'A', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 1,
    bodyParts: ['neck'], scenes: ['office'], steps: [], recommendedSets: 1,
  },
  {
    id: 'b', nameJa: 'B', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 2,
    bodyParts: ['shoulder', 'back'], scenes: ['home'], steps: [], recommendedSets: 2,
  },
];
```

`mockForGoals`配列の各オブジェクトにも`recommendedSets: 1`を追加：
```typescript
{ id: 'a', ..., steps: [], recommendedSets: 1 },
{ id: 'b', ..., steps: [], recommendedSets: 2 },
{ id: 'c', ..., steps: [], recommendedSets: 3 },
{ id: 'd', ..., steps: [], recommendedSets: 1 },
{ id: 'e', ..., steps: [], recommendedSets: 2 },
```

`mockForDuration`配列にも`recommendedSets: 1`を追加：
```typescript
{ id: 'x', ..., steps: [], recommendedSets: 1 },
{ id: 'y', ..., steps: [], recommendedSets: 1 },
{ id: 'z', ..., steps: [], recommendedSets: 1 },
```

最後の`mixed`配列（`applyDurationFilter`テスト内）にも`recommendedSets: 1`を追加。

- [ ] **Step 3: テストが通ることを確認**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage
```

Expected: PASS (全テスト通過)

- [ ] **Step 4: コミット**

```bash
git add src/types/index.ts __tests__/filterStretches.test.ts
git commit -m "feat: add recommendedSets to Stretch type and update test mocks"
```

---

## Task 2: `stretches.ts`全面更新（recommendedSets設定 + 7修正 + 13種追加）

**Files:**
- Modify: `src/data/stretches.ts`

- [ ] **Step 1: 既存25種に`recommendedSets`を追加し、7箇所の説明を修正**

`src/data/stretches.ts`の既存ストレッチに以下のルールで`recommendedSets`を設定：

```
recommendedSets: 1 → shoulder-roll, cat-cow, ankle-rotation, calf-raise-stretch, energize-full-stretch
recommendedSets: 2 → neck-side, chest-open, seated-twist, seated-hip, shoulder-cross,
                      forward-fold, butterfly, hamstring, shoulder-full, eye-neck-roll,
                      child-pose, supine-knee-hug, quad-stretch, standing-side-stretch,
                      deep-breath-chest-open, neck-full, shoulder-cross
recommendedSets: 3 → pigeon, spinal-twist, lunge
```

7箇所の修正内容：

**calf**: `descriptionJa`を変更
```typescript
descriptionJa: '壁に手をついて腓腹筋とヒラメ筋（ふくらはぎの筋肉）を伸ばす。膝を伸ばすと腓腹筋、軽く曲げるとヒラメ筋が中心にストレッチされる。',
```

**pigeon**: `descriptionJa`を変更
```typescript
descriptionJa: 'お尻の中央〜外側（中殿筋・外旋筋群）を深くストレッチする本格ポーズ。下肢にしびれや電気が走る感覚が出たら即中止。',
```

**neck-full**: `descriptionJa`を変更
```typescript
descriptionJa: '前後左右・回旋を含む首の総合ケア。血行促進と緊張緩和に。頸椎症・頸椎ヘルニアのある方は後屈を避け、痛みやしびれが出たら即中止。',
```

**forward-fold**: `descriptionJa`を変更
```typescript
descriptionJa: '立って上体を前に倒し、腰と太ももの裏を伸ばす。腰痛のある方は膝を必ず軽く曲げること。下肢の痺れが出たら即中止。',
```

**butterfly**: `nameJa`を変更
```typescript
nameJa: 'バタフライストレッチ（股関節内転筋）',
```

**shoulder-roll**: `descriptionJa`を変更
```typescript
descriptionJa: '肩甲骨の動的モビリゼーション。菱形筋の循環を促進しながら、前鋸筋・小胸筋の短縮を改善する。',
```

**lunge**: stepsの最初に追加
```typescript
steps: ['おへそを軽く引き込んで骨盤を安定させ、腰が反らないようにする', '立った状態から右足を大きく前に踏み出す', '前ひざは90度、後ろひざは床に近づける', '上体を起こしたまま股関節を前方向に押し出す', '30秒キープ後、反対側も'],
```

- [ ] **Step 2: 13種の新ストレッチを追記**

`ALL_STRETCHES`配列の末尾に以下を追加：

```typescript
  // ── 新規追加ストレッチ ────────────────────────────────
  {
    id: 'chin-tuck',
    nameJa: '顎引きストレッチ（スマホ首ケア）',
    descriptionJa: '顎を真後ろに水平に引き、頸部深層屈筋を活性化してストレートネック・スマホ首を改善する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['neck'],
    scenes: ['office', 'home', 'serious'],
    steps: ['背筋を伸ばして座る（または立つ）', '人差し指を顎の先に軽く当てる', '顎を真後ろに水平に引いていく（「二重顎を作る」イメージ）', '首の後ろが軽く伸びる感覚を確認し、5秒キープ', 'ゆっくり戻す。10回繰り返す', '息は止めず、引くときに息を吐く'],
    recommendedSets: 2,
  },
  {
    id: 'levator-scapula-stretch',
    nameJa: '肩甲挙筋ストレッチ（首〜肩の深部ほぐし）',
    descriptionJa: '僧帽筋上部と混同されやすい肩甲挙筋に直接アプローチし、首こり・肩こりの深部を解消する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['neck', 'shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['背筋を伸ばして座り、左手で椅子の縁をつかむ', '右手を頭の後ろから左側（後頭部と後頭骨の間）に置く', '頭を「右斜め前下方（右の鎖骨方向）」にゆっくり傾ける', '左肩が上がらないようにしっかり椅子をつかむ', '首の付け根から肩甲骨上角にかけての伸びを感じながら20秒キープ', '反対側も同様に'],
    recommendedSets: 2,
  },
  {
    id: 'pec-wall-stretch',
    nameJa: '大胸筋壁ストレッチ（巻き肩解消）',
    descriptionJa: '壁に前腕をつけて体を回転させ、大胸筋・小胸筋の短縮を解消。巻き肩・猫背の根本アプローチ。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['shoulder'],
    scenes: ['home', 'serious'],
    steps: ['壁の前に立ち、右腕を肩の高さで曲げて壁に前腕をつける（肘90度）', 'ゆっくり体を左方向に回転させる', '右胸前面（鎖骨下）の伸びを感じながら20秒キープ', '腕の高さを少し上げるとより上部の大胸筋に効く', '反対側も同様に', '息を吐きながら体を回転させる'],
    recommendedSets: 2,
  },
  {
    id: 'thoracic-open-book',
    nameJa: '胸椎オープンブック（猫背の根本改善）',
    descriptionJa: '横向きに寝て上側の腕を後方に開き、胸椎（T4〜T8）の回旋可動性を回復。肩こり・猫背・腰痛すべての根本にアプローチ。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['back', 'shoulder'],
    scenes: ['home', 'serious'],
    steps: ['床に横向き（右向き）に寝る', '両膝を90度に曲げて重ねる（腰椎を安定させる）', '両腕を胸の前に伸ばして手のひらを合わせる', '上側（左）の手をゆっくり頭の上から後方に向かって開いていく', '視線は開いた左手を追う（頭も一緒に回転）', '背中が床に近づくところで止め、呼吸しながら20秒キープ', '左右各2〜3セット'],
    recommendedSets: 3,
  },
  {
    id: 'thoracic-extension',
    nameJa: '胸椎伸展ストレッチ（猫背リセット）',
    descriptionJa: '丸めたタオルを肩甲骨下に置いて仰向けになり、長時間PC作業で固まった胸椎の伸展可動性を回復する。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['back', 'shoulder'],
    scenes: ['home', 'serious'],
    steps: ['タオルを太く巻いて棒状にする（直径8〜10cm）', '仰向けに寝てタオルを肩甲骨の下（T5〜T7付近）に横に置く', '両腕を頭の上に伸ばし、胸をゆっくり落として胸椎を伸展させる', '首が痛い場合は両手で頭を支える', '深呼吸しながら20〜30秒キープ', 'タオルの位置を少し上下に変えてもう一度行う'],
    recommendedSets: 2,
  },
  {
    id: 'iliopsoas-stretch',
    nameJa: '腸腰筋ストレッチ（反り腰・腰痛予防）',
    descriptionJa: '片膝立ちで骨盤を安定させながら股関節前面を伸ばし、座り仕事で短縮した腸腰筋（大腰筋＋腸骨筋）をケアする。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['hip', 'back'],
    scenes: ['home', 'serious'],
    steps: ['右膝を床につき、左足を前に出す（片膝立ちランジ）', 'おへそを軽く引き込んで骨盤を後傾させ、腰が反らないようにする', '上体を起こしたまま体重を前方へ移動する', '右股関節の前面（鼠蹊部）の伸びを感じながら20〜30秒キープ', '腰への痛みがある場合は上体を少し前に傾ける', '反対側も同様に'],
    recommendedSets: 3,
  },
  {
    id: 'piriformis-stretch',
    nameJa: '梨状筋ストレッチ（坐骨神経ケア）',
    descriptionJa: '仰向けでフィギュア4のポーズを取り、梨状筋を解放して坐骨神経痛を予防する。長時間座位のデスクワーカーに特効。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['hip', 'back'],
    scenes: ['home', 'serious'],
    steps: ['仰向けに寝て両膝を立てる', '右足首を左膝の上に乗せる（フィギュア4のポーズ）', '両手で左ももの裏をつかんで胸方向に引き寄せる', 'お尻の奥（梨状筋）の深い伸びを感じながら30秒キープ', '呼吸を止めず、吐くたびに少しだけ深めていく', '反対側も同様に'],
    recommendedSets: 3,
  },
  {
    id: 'pelvic-tilt',
    nameJa: '骨盤傾斜（腰痛予防の基礎）',
    descriptionJa: '仰向けで骨盤の前後傾を繰り返し、多裂筋・腹横筋を活性化して腰椎を安定させる。理学療法士が腰痛プログラムで必ず使う入門種目。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['back', 'hip'],
    scenes: ['home', 'serious'],
    steps: ['仰向けに寝て膝を立てる', '腰と床の間に手を入れて自分の腰の位置を確認', 'お腹を凹ませながら腰を床に押しつける（後傾）', '次に腰を軽く反らせて手を押し上げる（前傾）', '前傾・後傾を5秒ずつゆっくり交互に10回繰り返す', '最後に「中間位置」で止めて3回深呼吸'],
    recommendedSets: 1,
  },
  {
    id: 'quadratus-lumborum-stretch',
    nameJa: '腰方形筋ストレッチ（腰の横のほぐし）',
    descriptionJa: '椅子に座ったまま体側を伸ばし、腰痛・骨盤傾斜の主要因となる腰方形筋の緊張を緩和する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['back'],
    scenes: ['office', 'home', 'serious'],
    steps: ['椅子に座り、右手を椅子の外側に置いて体を支える', '左腕を耳の横に伸ばしながら上体を右に傾ける', '腰の左側（背骨の脇）の伸びを感じながら15〜20秒キープ', '上体が前に倒れないよう正面を向いたまま', '反対側も同様に', '息を吐きながら傾ける'],
    recommendedSets: 2,
  },
  {
    id: 'wall-slide',
    nameJa: 'ウォールスライド（姿勢リセット）',
    descriptionJa: '壁に背中・頭・かかとをつけて腕を上下させ、肩甲骨の正しい動作パターンを再教育する。猫背・巻き肩のリハビリ由来の種目。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['shoulder', 'back'],
    scenes: ['home', 'serious'],
    steps: ['壁を背にして立ち、背中・頭・かかとを壁につける', '両腕を肩の高さに上げ、肘を90度に曲げ、手の甲を壁につける', '手の甲が壁から離れないよう意識しながら腕をゆっくり上げていく', 'できる範囲で上げ、ゆっくり戻す', '10回繰り返す', '背中が壁から離れないよう、腹部を軽く引き込む'],
    recommendedSets: 1,
  },
  {
    id: 'it-band-stretch',
    nameJa: '腸脛靭帯（ITバンド）ストレッチ',
    descriptionJa: '足をクロスして体側を傾け、ランナー膝・膝外側痛の原因となる腸脛靭帯の緊張を解放する。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['leg', 'hip'],
    scenes: ['home', 'serious'],
    steps: ['足を肩幅に開いて立つ', '右足を左足の後ろにクロスさせる', '両腕を左方向に伸ばしながら上体を左に傾ける', '右の腰から太もも外側にかけての伸びを感じながら20秒キープ', '壁に手をついてバランスを取ってもよい', '反対側も同様に'],
    recommendedSets: 2,
  },
  {
    id: 'adductor-stretch',
    nameJa: '内転筋ストレッチ（太もも内側ほぐし）',
    descriptionJa: '仰向けで片足を真横に開き、内転筋群を片側ずつ丁寧にほぐす。バタフライストレッチよりも深くアプローチできる。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['hip', 'leg'],
    scenes: ['home', 'serious'],
    steps: ['床に仰向けになる', '右足を真横に大きく開き、足先を天井に向ける', '右手を右ひざの内側に軽く添えて支える', '太ももの内側（鼠蹊部〜膝の内側）の伸びを感じながら20〜30秒キープ', '息を吐くたびに少しだけ深めていく', '反対側も同様に'],
    recommendedSets: 2,
  },
  {
    id: 'diaphragm-breathing',
    nameJa: '横隔膜呼吸（自律神経調整）',
    descriptionJa: '腹部だけを使った横隔膜呼吸で副交感神経を優位にし、ストレス解消・集中力回復・就寝前のリラックスに効果的。',
    image: placeholder,
    durationSeconds: 45,
    difficulty: 1,
    bodyParts: ['back'],
    scenes: ['office', 'home', 'serious'],
    steps: ['仰向けに寝て（または椅子に座って）リラックスする', '右手をお腹（おへそ）の上、左手を胸の上に置く', '鼻からゆっくり4秒かけて吸いながら、右手（お腹）だけを膨らませる', '胸（左手）はできるだけ動かさない', '口からゆっくり6秒かけて吐きながらお腹を凹ませる', '5〜8回繰り返す'],
    recommendedSets: 1,
  },
```

- [ ] **Step 3: TypeScriptコンパイルエラーがないことを確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: 既存テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/data/stretches.ts
git commit -m "feat: add recommendedSets to all stretches, add 13 new stretches, fix 7 descriptions"
```

---

## Task 3: `prescription.ts`のテストを作成（TDD）

**Files:**
- Create: `__tests__/prescription.test.ts`

- [ ] **Step 1: テストファイルを作成**

`__tests__/prescription.test.ts`:

```typescript
import { getPrescription, getCompletedMinutes, getSessionStretchIds } from '../src/utils/prescription';
import { Stretch } from '../src/types';

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
```

- [ ] **Step 2: テストが失敗することを確認（ファイル未作成のため）**

```bash
npx jest __tests__/prescription.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/utils/prescription'`

- [ ] **Step 3: コミット（failing tests）**

```bash
git add __tests__/prescription.test.ts
git commit -m "test: add prescription utility tests (failing)"
```

---

## Task 4: `prescription.ts`を実装

**Files:**
- Create: `src/utils/prescription.ts`

- [ ] **Step 1: `src/utils/prescription.ts`を作成**

```typescript
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
    const s = stretchMap.get(id)!;
    return sum + s.durationSeconds * s.recommendedSets;
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
```

- [ ] **Step 2: テストを実行して全て通ることを確認**

```bash
npx jest __tests__/prescription.test.ts --no-coverage
```

Expected: PASS (9テスト全通過)

- [ ] **Step 3: コミット**

```bash
git add src/utils/prescription.ts
git commit -m "feat: implement prescription utility (getPrescription, getCompletedMinutes, getSessionStretchIds)"
```

---

## Task 5: `useUserStore`に`dailyProgress`を追加（TDD）

**Files:**
- Modify: `__tests__/useUserStore.test.ts`
- Modify: `src/store/useUserStore.ts`

- [ ] **Step 1: `useUserStore.test.ts`に`dailyProgress`テストを追加**

既存の`beforeEach`に`dailyProgress`の初期化を追加し、テストケースを追記：

```typescript
beforeEach(() => {
  useUserStore.setState({
    onboardingCompleted: false,
    bodyParts: [],
    scene: 'office',
    notificationEnabled: false,
    notificationTimes: [],
    dailyProgress: { date: '', completedStretchIds: [] },
  });
});
```

ファイル末尾に追加：

```typescript
describe('markStretchesCompleted', () => {
  it('marks stretches as completed for today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck', 'neck-side']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck', 'neck-side']);
  });

  it('deduplicates when called multiple times on same day', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    act(() => result.current.markStretchesCompleted(['chin-tuck', 'neck-side']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck', 'neck-side']);
  });

  it('resets progress when date is different from today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => {
      useUserStore.setState({
        dailyProgress: { date: '2020-01-01', completedStretchIds: ['old-stretch'] },
      });
    });
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    expect(result.current.dailyProgress.completedStretchIds).toEqual(['chin-tuck']);
    expect(result.current.dailyProgress.completedStretchIds).not.toContain('old-stretch');
  });

  it('sets date to today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.markStretchesCompleted(['chin-tuck']));
    const today = new Date().toISOString().slice(0, 10);
    expect(result.current.dailyProgress.date).toBe(today);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/useUserStore.test.ts --no-coverage
```

Expected: FAIL — `dailyProgress is not defined` または `markStretchesCompleted is not a function`

- [ ] **Step 3: `useUserStore.ts`を更新**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, UserProfile } from '../types';

interface DailyProgress {
  date: string;
  completedStretchIds: string[];
}

interface UserStore extends UserProfile {
  dailyProgress: DailyProgress;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      notificationEnabled: false,
      notificationTimes: [],
      dailyProgress: { date: '', completedStretchIds: [] },
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markStretchesCompleted: (ids) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const existing =
            state.dailyProgress.date === today ? state.dailyProgress.completedStretchIds : [];
          const merged = Array.from(new Set([...existing, ...ids]));
          return { dailyProgress: { date: today, completedStretchIds: merged } };
        }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 4: テストが全て通ることを確認**

```bash
npx jest __tests__/useUserStore.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/useUserStore.ts __tests__/useUserStore.test.ts
git commit -m "feat: add dailyProgress and markStretchesCompleted to useUserStore"
```

---

## Task 6: `SessionScreen`と`CompletionScreen`を更新

**Files:**
- Modify: `src/screens/SessionScreen.tsx`
- Modify: `src/screens/CompletionScreen.tsx`

- [ ] **Step 1: `SessionScreen.tsx`を更新**

stretchesの取得方法を`filter`から`map`に変更（重複IDを保持するため）し、Completionに`completedStretchIds`を渡す：

```typescript
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountdownTimer from '../components/CountdownTimer';
import { ALL_STRETCHES } from '../data/stretches';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionScreen() {
  useKeepAwake();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  // mapを使って重複IDを保持（同じストレッチを複数セット実行できる）
  const stretches = route.params.stretchIds
    .map((id) => ALL_STRETCHES.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);

  const current = stretches[index];

  function advance() {
    if (index + 1 >= stretches.length) {
      const uniqueIds = Array.from(new Set(stretches.map((s) => s.id)));
      navigation.replace('Completion', { completedStretchIds: uniqueIds });
    } else {
      setRunning(false);
      setIndex((i) => i + 1);
      setTimeout(() => setRunning(true), 400);
    }
  }

  function handleEnd() {
    Alert.alert('終了しますか？', 'セッションを途中で終了します', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '終了', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }

  if (!current) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>{index + 1} / {stretches.length}</Text>
        <TouchableOpacity onPress={handleEnd}>
          <Text style={styles.endBtn}>終了</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={current.image} style={styles.image} resizeMode="contain" />
        <Text style={styles.name}>{current.nameJa}</Text>
        <CountdownTimer
          key={index}
          durationSeconds={current.durationSeconds}
          running={running}
          onComplete={advance}
        />
        <Text style={styles.desc}>{current.descriptionJa}</Text>
        {current.steps.map((step, i) => (
          <Text key={i} style={styles.step}>・{step}</Text>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.skipBtn} onPress={advance}>
        <Text style={styles.skipText}>スキップ →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  progress: { fontSize: 16, color: '#555' },
  endBtn: { fontSize: 15, color: '#F44336', fontWeight: 'bold' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 100 },
  image: { width: '100%', height: 220, marginBottom: 20, borderRadius: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  step: { fontSize: 14, color: '#666', alignSelf: 'flex-start', marginTop: 8, lineHeight: 20 },
  skipBtn: { position: 'absolute', bottom: 32, right: 24 },
  skipText: { fontSize: 15, color: '#4CAF50', fontWeight: 'bold' },
});
```

- [ ] **Step 2: `CompletionScreen.tsx`を更新**

```typescript
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Completion'>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const markStretchesCompleted = useUserStore((s) => s.markStretchesCompleted);

  useEffect(() => {
    markStretchesCompleted(route.params.completedStretchIds);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>お疲れ様でした！</Text>
      <Text style={styles.sub}>ストレッチ完了です。継続することが大切です。</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Main')}>
        <Text style={styles.buttonText}>ホームに戻る</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  sub: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
```

- [ ] **Step 3: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/screens/SessionScreen.tsx src/screens/CompletionScreen.tsx
git commit -m "feat: pass completedStretchIds to CompletionScreen and mark daily progress"
```

---

## Task 7: `DailyMustCard`コンポーネントを作成

**Files:**
- Create: `src/components/DailyMustCard.tsx`

- [ ] **Step 1: `src/components/DailyMustCard.tsx`を作成**

```typescript
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALL_STRETCHES } from '../data/stretches';
import { Prescription, getCompletedMinutes, getSessionStretchIds } from '../utils/prescription';

interface Props {
  prescription: Prescription;
  completedStretchIds: string[];
  onStart: (stretchIds: string[]) => void;
}

export default function DailyMustCard({ prescription, completedStretchIds, onStart }: Props) {
  const completedSet = new Set(completedStretchIds);
  const completedMin = getCompletedMinutes(completedStretchIds, prescription.stretchIds, ALL_STRETCHES);
  const progressRatio = prescription.totalMinutes > 0
    ? Math.min(completedMin / prescription.totalMinutes, 1)
    : 0;
  const isCompleted = progressRatio >= 1;
  const remainingMin = Math.max(prescription.totalMinutes - completedMin, 0);

  function handleStart() {
    const sessionIds = getSessionStretchIds(prescription, completedStretchIds, ALL_STRETCHES);
    if (sessionIds.length > 0) onStart(sessionIds);
  }

  const stretchMap = new Map(ALL_STRETCHES.map((s) => [s.id, s]));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>💊 今日のマスト · {prescription.label}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {completedMin} <Text style={styles.progressTotal}>/ {prescription.totalMinutes}分</Text>
        </Text>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
      </View>

      {isCompleted ? (
        <Text style={styles.completedText}>🎉 今日のマスト達成！</Text>
      ) : (
        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>残り{remainingMin}分やる →</Text>
        </Pressable>
      )}

      <View style={styles.list}>
        {prescription.stretchIds.map((id) => {
          const stretch = stretchMap.get(id);
          if (!stretch) return null;
          const done = completedSet.has(id);
          return (
            <View key={id} style={[styles.listItem, done && styles.listItemDone]}>
              <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                {done && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.listItemText, done && styles.listItemTextDone]}>
                {stretch.nameJa} × {stretch.recommendedSets}セット
              </Text>
              <Text style={styles.listItemDuration}>
                {stretch.durationSeconds * stretch.recommendedSets}秒
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginBottom: 6,
  },
  progressRow: {
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  progressTotal: {
    fontSize: 14,
    opacity: 0.8,
  },
  progressBarBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    height: 6,
    marginBottom: 12,
  },
  progressBarFill: {
    backgroundColor: '#fff',
    borderRadius: 4,
    height: 6,
  },
  completedText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  listItemDone: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  checkMark: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  listItemTextDone: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  listItemDuration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
});
```

- [ ] **Step 2: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/DailyMustCard.tsx
git commit -m "feat: add DailyMustCard component"
```

---

## Task 8: `HomeScreen`を更新

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: `HomeScreen.tsx`を更新**

`getRecommended`の呼び出しと「今日のおすすめ」セクションを削除し、`DailyMustCard`を追加：

```typescript
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyMustCard from '../components/DailyMustCard';
import GoalSelectorModal from '../components/GoalSelectorModal';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { BodyPart, RootStackParamList, Scene } from '../types';
import { getPrescription } from '../utils/prescription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCENE_LABELS: Record<Scene, string> = {
  office: '💼 オフィス',
  home: '🏠 自宅',
  serious: '💪 本格',
};

const BODY_LABELS: Record<BodyPart, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene, dailyProgress } = useUserStore();
  const [modalVisible, setModalVisible] = useState(false);

  const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene);

  function startSession(stretchIds: string[]) {
    if (stretchIds.length === 0) return;
    navigation.navigate('Session', { stretchIds });
  }

  function handleGoalStart(stretchIds: string[]) {
    setModalVisible(false);
    navigation.navigate('Session', { stretchIds });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {prescription.stretchIds.length > 0 && (
          <DailyMustCard
            prescription={prescription}
            completedStretchIds={dailyProgress.completedStretchIds}
            onStart={startSession}
          />
        )}

        <Pressable style={styles.goalButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.goalButtonText}>今日の気分で選ぶ →</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>シーンで探す</Text>
        <View style={styles.row}>
          {(['office', 'home', 'serious'] as Scene[]).map((sc) => (
            <Pressable
              key={sc}
              style={styles.sceneChip}
              onPress={() => startSession(ALL_STRETCHES.filter((s) => s.scenes.includes(sc)).map((s) => s.id))}
            >
              <Text style={styles.sceneChipText}>{SCENE_LABELS[sc]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>部位で探す</Text>
        <View style={styles.row}>
          {(Object.keys(BODY_LABELS) as BodyPart[]).map((bp) => (
            <Pressable
              key={bp}
              style={styles.bodyChip}
              onPress={() => startSession(ALL_STRETCHES.filter((s) => s.bodyParts.includes(bp)).map((s) => s.id))}
            >
              <Text style={styles.bodyChipText}>{BODY_LABELS[bp]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <GoalSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStart={handleGoalStart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  goalButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  sceneChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  sceneChipText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  bodyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8' },
  bodyChipText: { fontSize: 14, color: '#6A1B9A', fontWeight: '600' },
});
```

- [ ] **Step 2: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 3: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: replace おすすめ with DailyMustCard on HomeScreen"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Section 1-1: `recommendedSets`型追加 → Task 1
- ✅ Section 1-2: `dailyProgress` + `markStretchesCompleted` → Task 5
- ✅ Section 2: 13種新ストレッチ + 全recommendedSets → Task 2
- ✅ Section 3: 7箇所修正 → Task 2
- ✅ Section 4: `prescription.ts`（getPrescription, getCompletedMinutes, getSessionStretchIds, scene filter） → Task 3+4
- ✅ Section 5: `DailyMustCard` → Task 7
- ✅ Section 6: HomeScreen更新 → Task 8
- ✅ Section 7: CompletionScreen + SessionScreen更新 → Task 6
- ✅ Section 8: GoalSelectorModalの変更はCompletionScreenで自動対応 → Task 6

**Placeholder scan:** プレースホルダーなし。全ステップにコード記載済み。

**Type consistency check:**
- `Prescription`インターフェースはTask 4で定義、Task 7+8で使用 ✅
- `markStretchesCompleted(ids: string[])` はTask 5で定義、Task 6で使用 ✅
- `dailyProgress.completedStretchIds` はTask 5で定義、Task 8で使用 ✅
- `RootStackParamList.Completion: { completedStretchIds: string[] }` はTask 1で変更、Task 6で使用 ✅
- `Stretch.recommendedSets` はTask 1で追加、Task 2でデータ設定、Task 3+4+7で使用 ✅
