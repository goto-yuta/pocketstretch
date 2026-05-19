# ストレッチメニュー充実 & ゴールセレクター設計

## 概要

ユーザーが「今日やりたいこと」に応じてストレッチを選べるよう、モーダル形式のゴールセレクターを追加する。既存のホーム画面・おすすめロジックは維持しつつ、新しい入り口を追加する。

## ユーザーフロー

1. ホーム画面に「今日の気分で選ぶ」ボタンを表示
2. タップ → GoalSelectorModal が開く
3. モーダルで選択（すべて任意）:
   - 悩み・目的（複数選択可）
   - 時間
4. 「おすすめを見る」→ 条件でフィルタしたストレッチで Session 開始
5. 何も選ばずスキップ → Session はキャンセル（モーダルを閉じるだけ）

## アーキテクチャ

### 新規ファイル
- `src/components/GoalSelectorModal.tsx` — モーダルUI
- （既存ファイルの修正のみ、新規画面なし）

### 修正ファイル
- `src/types/index.ts` — `Goal`・`DurationFilter` 型を追加
- `src/utils/filterStretches.ts` — `filterByGoals()` 関数を追加
- `src/data/stretches.ts` — ストレッチ10件追加
- `src/screens/HomeScreen.tsx` — ボタン追加・モーダル統合

## データ設計

### Goal 型

```typescript
export type Goal =
  | 'shoulder-stiffness'  // 肩こり
  | 'neck-stiffness'      // 首こり
  | 'lower-back-pain'     // 腰痛
  | 'drowsiness'          // 眠気
  | 'eye-strain'          // 目の疲れ
  | 'leg-swelling'        // むくみ（脚）
  | 'relax'               // リラックス
  | 'focus'               // 集中力アップ
  | 'warmup'              // ウォームアップ
  | 'cooldown'            // クールダウン
  | 'mood-change';        // 気分転換

export type DurationFilter = '3min' | '5min' | '10min' | 'any';
```

### Goal → フィルター変換（filterStretches.ts 内）

| Goal | bodyParts | maxDifficulty | scenes |
|------|-----------|---------------|--------|
| shoulder-stiffness | shoulder, neck | — | — |
| neck-stiffness | neck | — | — |
| lower-back-pain | back | — | — |
| drowsiness | neck, shoulder | 2 | — |
| eye-strain | neck | — | — |
| leg-swelling | leg, hip | — | — |
| relax | — | 2 | — |
| focus | neck, shoulder | — | office, home |
| warmup | — | min:2 | — |
| cooldown | — | 2 | — |
| mood-change | — | — | — （全体からランダム5件）|

### DurationFilter → 累計秒数上限

| 選択肢 | 最大合計秒数 |
|--------|-------------|
| 3min | 180秒 |
| 5min | 300秒 |
| 10min | 600秒 |
| any | 制限なし |

複数ゴール選択時: OR で bodyParts をマージ、AND で difficulty を適用（最も厳しい条件）。

### ストレッチ追加方針（10件）

追加カテゴリ:
- 目の疲れ向け（首・肩、難易度1-2）: 2件
- 眠気覚まし向け（全身、難易度2）: 2件
- リラックス向け（ゆっくり系、難易度1-2）: 2件
- クールダウン向け（難易度1）: 2件
- 気分転換・全身系（難易度2-3）: 2件

## UI設計

### GoalSelectorModal

- React Native `Modal` (transparent + slide animation)
- セクション1: 悩み・目的（emoji付きチップ、multi-select）
- セクション2: 時間（ラジオ風シングルセレクト）
- フッター: 「おすすめを見る（X件）」ボタン + 「スキップ」テキストリンク
- 件数はリアルタイム更新（選択変更のたびに再計算）
- 0件になったら「条件に合うストレッチが見つかりません」と表示

### HomeScreen 変更

- 「今日のおすすめ」見出しの上に「今日の気分で選ぶ →」ボタン追加
- 既存の「シーンで探す」「部位で探す」チップはそのまま残す

## テスト方針

- `filterByGoals()` のユニットテスト: 各ゴール・組み合わせが正しいストレッチを返すか
- DurationFilter が合計秒数を超えないか
- 0件ケースのハンドリング
