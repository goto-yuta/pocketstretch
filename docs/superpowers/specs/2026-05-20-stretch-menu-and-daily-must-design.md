# Spec: ストレッチメニュー拡充 + 今日のマスト機能

Date: 2026-05-20

## 概要

専門性向上のため新ストレッチ13種を追加し、ユーザーの体の部位ニーズに応じた「今日やるべきストレッチ（マスト）」をホーム最上部に提示する。達成進捗は日またぎでリセットされ、継続を促す。

---

## 1. データモデル変更

### 1-1. `Stretch` 型に `recommendedSets` を追加

```typescript
// src/types/index.ts
export interface Stretch {
  // ... 既存フィールド ...
  recommendedSets: 1 | 2 | 3; // 1=モビリゼーション系, 2=標準静的, 3=深部・本格
}
```

セット数の方針：
- `1`: 動的モビリゼーション系（repsで完結：shoulder-roll, cat-cow, ankle-rotation, calf-raise-stretch, energize-full-stretch, pelvic-tilt, wall-slide, diaphragm-breathing）
- `2`: 標準的な静的ストレッチ（neck-side, hamstring, butterfly, calf, quad-stretch など多数）
- `3`: 深部・本格系（pigeon, spinal-twist, piriformis-stretch, thoracic-open-book, iliopsoas-stretch）

### 1-2. `useUserStore` に `dailyProgress` を追加

```typescript
interface DailyProgress {
  date: string;              // 'YYYY-MM-DD'
  completedStretchIds: string[]; // 当日完了済みの stretchId 一覧
}

interface UserStore extends UserProfile {
  // ... 既存フィールド ...
  dailyProgress: DailyProgress;
  markStretchesCompleted: (ids: string[]) => void; // 完了マーク（日付が変わればリセット）
}
```

`markStretchesCompleted` の実装：
- 現在の `dailyProgress.date` が今日と異なれば `completedStretchIds: []` にリセットしてから追加
- 同じ日なら追記（重複は除く）

---

## 2. 新ストレッチ 13種

既存の `recommendedSets` も一括設定。`src/data/stretches.ts` に追記。

| id | 名前 | bodyParts | scenes | difficulty | durationSec | sets |
|----|------|-----------|--------|------------|-------------|------|
| `chin-tuck` | 顎引きストレッチ（スマホ首ケア） | neck | office/home/serious | 1 | 30 | 2 |
| `levator-scapula-stretch` | 肩甲挙筋ストレッチ | neck/shoulder | office/home/serious | 1 | 30 | 2 |
| `pec-wall-stretch` | 大胸筋壁ストレッチ（巻き肩解消） | shoulder | home/serious | 2 | 30 | 2 |
| `thoracic-open-book` | 胸椎オープンブック（猫背の根本改善） | back/shoulder | home/serious | 2 | 40 | 3 |
| `thoracic-extension` | 胸椎伸展ストレッチ（猫背リセット） | back/shoulder | home/serious | 2 | 40 | 2 |
| `iliopsoas-stretch` | 腸腰筋ストレッチ（反り腰・腰痛予防） | hip/back | home/serious | 2 | 40 | 3 |
| `piriformis-stretch` | 梨状筋ストレッチ（坐骨神経ケア） | hip/back | home/serious | 2 | 40 | 3 |
| `pelvic-tilt` | 骨盤傾斜（腰痛予防の基礎） | back/hip | home/serious | 2 | 40 | 1 |
| `quadratus-lumborum-stretch` | 腰方形筋ストレッチ | back | office/home/serious | 1 | 30 | 2 |
| `wall-slide` | ウォールスライド（姿勢リセット） | shoulder/back | home/serious | 2 | 40 | 1 |
| `it-band-stretch` | 腸脛靭帯（ITバンド）ストレッチ | leg/hip | home/serious | 2 | 40 | 2 |
| `adductor-stretch` | 内転筋ストレッチ | hip/leg | home/serious | 2 | 40 | 2 |
| `diaphragm-breathing` | 横隔膜呼吸（自律神経調整） | back | office/home/serious | 1 | 45 | 1 |

各ストレッチの詳細 steps は以下の通り（リサーチ結果より）。

**chin-tuck（顎引きストレッチ）**
steps: ['背筋を伸ばして座る（または立つ）', '人差し指を顎の先に軽く当てる', '顎を真後ろに水平に引いていく（「二重顎を作る」イメージ）', '首の後ろが軽く伸びる感覚を確認し、5秒キープ', 'ゆっくり戻す。10回繰り返す', '息は止めず、引くときに息を吐く']

**levator-scapula-stretch（肩甲挙筋ストレッチ）**
steps: ['背筋を伸ばして座り、左手で椅子の縁をつかむ', '右手を頭の後ろから左側（後頭部と後頭骨の間）に置く', '頭を「右斜め前下方（右の鎖骨方向）」にゆっくり傾ける', '左肩が上がらないようにしっかり椅子をつかむ', '首の付け根から肩甲骨上角にかけての伸びを感じながら20秒キープ', '反対側も同様に']

**pec-wall-stretch（大胸筋壁ストレッチ）**
steps: ['壁の前に立ち、右腕を肩の高さで曲げて壁に前腕をつける（肘90度）', 'ゆっくり体を左方向に回転させる', '右胸前面（鎖骨下）の伸びを感じながら20秒キープ', '腕の高さを少し上げるとより上部の大胸筋に効く', '反対側も同様に', '息を吐きながら体を回転させる']

**thoracic-open-book（胸椎オープンブック）**
steps: ['床に横向き（右向き）に寝る', '両膝を90度に曲げて重ねる（腰椎を安定させる）', '両腕を胸の前に伸ばして手のひらを合わせる', '上側（左）の手をゆっくり頭の上から後方に向かって開いていく', '視線は開いた左手を追う（頭も一緒に回転）', '背中が床に近づくところで止め、呼吸しながら20秒キープ', '左右各2〜3セット']

**thoracic-extension（胸椎伸展ストレッチ）**
steps: ['タオルを太く巻いて棒状にする（直径8〜10cm）', '仰向けに寝てタオルを肩甲骨の下（T5〜T7付近）に横に置く', '両腕を頭の上に伸ばし、胸をゆっくり落として胸椎を伸展させる', '首が痛い場合は両手で頭を支える', '深呼吸しながら20〜30秒キープ', 'タオルの位置を少し上下に変えてもう一度行う']

**iliopsoas-stretch（腸腰筋ストレッチ）**
steps: ['右膝を床につき、左足を前に出す（片膝立ちランジ）', 'おへそを軽く引き込んで骨盤を後傾させ、腰が反らないようにする', '上体を起こしたまま体重を前方へ移動する', '右股関節の前面（鼠蹊部）の伸びを感じながら20〜30秒キープ', '腰への痛みがある場合は上体を少し前に傾ける', '反対側も同様に']

**piriformis-stretch（梨状筋ストレッチ）**
steps: ['仰向けに寝て両膝を立てる', '右足首を左膝の上に乗せる（フィギュア4のポーズ）', '両手で左ももの裏をつかんで胸方向に引き寄せる', 'お尻の奥（梨状筋）の深い伸びを感じながら30秒キープ', '呼吸を止めず、吐くたびに少しだけ深めていく', '反対側も同様に']

**pelvic-tilt（骨盤傾斜）**
steps: ['仰向けに寝て膝を立てる', '腰と床の間に手を入れて自分の腰の位置を確認', 'お腹を凹ませながら腰を床に押しつける（後傾）', '次に腰を軽く反らせて手を押し上げる（前傾）', '前傾・後傾を5秒ずつゆっくり交互に10回繰り返す', '最後に「中間位置」で止めて3回深呼吸']

**quadratus-lumborum-stretch（腰方形筋ストレッチ）**
steps: ['椅子に座り、右手を椅子の外側に置いて体を支える', '左腕を耳の横に伸ばしながら上体を右に傾ける', '腰の左側（背骨の脇）の伸びを感じながら15〜20秒キープ', '上体が前に倒れないよう正面を向いたまま', '反対側も同様に', '息を吐きながら傾ける']

**wall-slide（ウォールスライド）**
steps: ['壁を背にして立ち、背中・頭・かかとを壁につける', '両腕を肩の高さに上げ、肘を90度に曲げ、手の甲を壁につける', '手の甲が壁から離れないよう意識しながら腕をゆっくり上げていく', 'できる範囲で上げ、ゆっくり戻す', '10回繰り返す', '背中が壁から離れないよう、腹部を軽く引き込む']

**it-band-stretch（腸脛靭帯ストレッチ）**
steps: ['足を肩幅に開いて立つ', '右足を左足の後ろにクロスさせる', '両腕を左方向に伸ばしながら上体を左に傾ける', '右の腰から太もも外側にかけての伸びを感じながら20秒キープ', '壁に手をついてバランスを取ってもよい', '反対側も同様に']

**adductor-stretch（内転筋ストレッチ）**
steps: ['床に仰向けになる', '右足を真横に大きく開き、足先を天井に向ける', '右手を右ひざの内側に軽く添えて支える', '太ももの内側（鼠蹊部〜膝の内側）の伸びを感じながら20〜30秒キープ', '息を吐くたびに少しだけ深めていく', '反対側も同様に']

**diaphragm-breathing（横隔膜呼吸）**
steps: ['仰向けに寝て（または椅子に座って）リラックスする', '右手をお腹（おへそ）の上、左手を胸の上に置く', '鼻からゆっくり4秒かけて吸いながら、右手（お腹）だけを膨らませる', '胸（左手）はできるだけ動かさない', '口からゆっくり6秒かけて吐きながらお腹を凹ませる', '5〜8回繰り返す']

---

## 3. 既存ストレッチの修正

`src/data/stretches.ts` の以下7箇所を修正：

| id | 問題 | 修正内容 |
|----|------|----------|
| `calf` | 「アキレス腱を伸ばす」は医学的に不正確 | 「腓腹筋とヒラメ筋を伸ばす。膝を伸ばすと腓腹筋、軽く曲げるとヒラメ筋が中心」に変更 |
| `pigeon` | ターゲット筋が曖昧・坐骨神経注意なし | 「お尻の中央〜外側（中殿筋・外旋筋群）」を明記。「下肢に痺れが出たら即中止」追加 |
| `neck-full` | 後屈ステップに禁忌なし | 「頸椎症・頸椎ヘルニアのある方は後屈を避ける。痛みやしびれで即中止」追加 |
| `forward-fold` | 腰椎ヘルニア禁忌の明示なし | 「腰痛のある方は膝を必ず軽く曲げる。下肢の痺れで即中止」追加 |
| `butterfly` | 「蝶番」は意味不明 | `nameJa` を「バタフライストレッチ（股関節内転筋）」に変更 |
| `shoulder-roll` | 静的ストレッチと混同される説明 | 「肩甲骨の動的モビリゼーション。菱形筋の循環促進と小胸筋の短縮改善が目的」に変更 |
| `lunge` | 腰が反るリスクへの言及なし | steps に「腰が反らないようおへそを軽く引き込み骨盤を安定させる」を追加 |

また全ストレッチに `recommendedSets` を設定する（上記方針に従う）。

---

## 4. 処方ロジック (`src/utils/prescription.ts` 新規作成)

### 4-1. `bodyParts` → 処方ストレッチのマッピング

```typescript
const BODY_PRESCRIPTION: Record<BodyPart, string[]> = {
  neck:     ['chin-tuck', 'levator-scapula-stretch', 'neck-side'],
  shoulder: ['pec-wall-stretch', 'thoracic-open-book', 'chest-open'],
  back:     ['thoracic-open-book', 'cat-cow', 'quadratus-lumborum-stretch'],
  hip:      ['piriformis-stretch', 'iliopsoas-stretch', 'butterfly'],
  leg:      ['hamstring', 'calf', 'it-band-stretch'],
};
```

### 4-2. `getPrescription` 関数

```typescript
interface Prescription {
  stretchIds: string[];   // 重複なし、処方ストレッチ一覧（シーンフィルター済み）
  totalMinutes: number;   // Math.ceil(Σ(durationSeconds × recommendedSets) / 60)
  label: string;          // 「肩こり + 腰痛ケア」など
}

export function getPrescription(
  stretches: Stretch[],
  bodyParts: BodyPart[],
  scene: Scene          // ユーザーの現在シーン。処方ストレッチをシーンでフィルタする
): Prescription
```

- bodyParts ごとの処方 stretchIds をマージ・重複除去
- `scene` に含まれない stretch（`s.scenes.includes(scene)` が false）は除外
- `totalMinutes = Math.ceil(Σ(s.durationSeconds × s.recommendedSets) / 60)`
- `label` は bodyPart → 日本語名称のマッピングで生成（例: `{neck:'首こり', shoulder:'肩こり', back:'腰痛ケア', hip:'股関節ケア', leg:'脚ケア'}`）

### 4-2b. `getCompletedMinutes` 関数

```typescript
export function getCompletedMinutes(
  completedStretchIds: string[],
  prescriptionStretchIds: string[],
  allStretches: Stretch[]
): number
// completedStretchIds ∩ prescriptionStretchIds の各ストレッチについて
// Math.ceil(Σ(durationSeconds × recommendedSets) / 60) を返す
```

### 4-3. `getSessionStretchIds` 関数

処方ストレッチのうち未完了のものを、`recommendedSets` 回繰り返した配列を返す。
SessionScreen はこの配列をそのまま受け取れる（既存インターフェース互換）。

```typescript
export function getSessionStretchIds(
  prescription: Prescription,
  completedStretchIds: string[],
  allStretches: Stretch[]
): string[] // ['chin-tuck', 'chin-tuck', 'neck-side', 'neck-side', ...]
```

---

## 5. 新コンポーネント: `DailyMustCard`

`src/components/DailyMustCard.tsx` を新規作成。

### Props

```typescript
interface Props {
  prescription: Prescription;
  completedStretchIds: string[];
  allStretches: Stretch[];
  onStart: (stretchIds: string[]) => void;
}
```

### 表示仕様

- **グラデーション背景**（緑系）のカード
- 上部：ラベル「💊 今日のマスト · {label}」
- 中央：達成分数の表示「{completedMin} / {totalMin}分」
- プログレスバー（達成率）
- 下部：
  - 未達成時：「残りXminやる →」ボタン → `onStart(getSessionStretchIds(...))` を呼ぶ
  - 達成時：「🎉 今日のマスト達成！」（ボタンなし）
- チェックリスト：処方ストレッチを一覧表示
  - 完了済み：✓ アイコン + 打ち消し線 + 緑背景
  - 未完了：○ アイコン + 通常表示
  - 各行に「{nameJa} × {recommendedSets}セット」と「{durationSeconds × recommendedSets}秒」表示

---

## 6. `HomeScreen` の変更

- **削除**: 「今日のおすすめ」セクション（`getRecommended` 呼び出し含む）
- **追加**: `DailyMustCard` を ScrollView 最上部に配置
- 「今日の気分で選ぶ」ボタンは `DailyMustCard` の下に残す
- 「シーンで探す」「部位で探す」セクションはそのまま維持

---

## 7. `CompletionScreen` の変更

セッション完了時に、完了したストレッチを `markStretchesCompleted` でマーク。

- `SessionScreen` → `CompletionScreen` へ遷移する際、完了した `stretchIds`（重複除去済み）を渡す
- `RootStackParamList` の `Completion` パラメータに `completedStretchIds: string[]` を追加
- `CompletionScreen` で `markStretchesCompleted(completedStretchIds)` を呼ぶ

---

## 8. `GoalSelectorModal` の変更（処方上書き）

ゴール選択でセッションを開始した場合、そのセッションで消化されたストレッチも `markStretchesCompleted` でマークされる。GoalSelectorModal 自体の変更は最小限（上記 Completion 変更で自動的に対応）。

---

## 9. スコープ外

- ストレッチ画像（引き続きplaceholder）
- 週単位・曜日別プログラム
- 処方のカスタマイズ画面
- ストリーク機能
