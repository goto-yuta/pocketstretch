# セッションタイマー強化 設計仕様

## 概要

セッション画面（`SessionScreen`）のカウントダウンタイマーを視覚的・操作的に強化する。現在の「円の中に数字」表示を SVG リングアニメーションに置き換え、一時停止・再開ボタンを追加する。

## 目標

- タイマー残り時間が一目でわかるリングアニメーション
- セッション中に自由に一時停止・再開できる操作性
- 既存機能（スキップ、自動遷移、画面ロック防止）への影響なし

## 変更ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/components/CountdownTimer.tsx` | 修正 | SVG リングアニメーション追加 |
| `src/screens/SessionScreen.tsx` | 修正 | `paused` state + 一時停止ボタン追加 |
| `package.json` / `expo` | 依存追加 | `react-native-svg` |

## 詳細設計

### CountdownTimer コンポーネント

**インターフェース（変更なし）**

```typescript
interface Props {
  durationSeconds: number;
  onComplete: () => void;
  running: boolean;
}
```

**ビジュアル**

- サイズ: 160 × 160 px（現在 100px から拡大）
- 背景リング: 薄いグレー (`#e0e0e0`)、strokeWidth 8
- 前景リング: グリーン (`#4CAF50`)、strokeWidth 8
- 中央: 残り秒数（36px bold）＋「秒」ラベル（12px）
- アニメーション: 12時の位置から時計回りに弧が消えていく

**SVG リング実装方針**

- `react-native-svg` の `Circle` を `Animated.createAnimatedComponent` でラップ
- `stroke-dasharray = circumference`、`stroke-dashoffset` を Animated.Value で制御
- `circumference = 2 * π * radius`（radius = 68）
- `remaining` が変化するたびに `dashoffset = circumference * (1 - remaining / durationSeconds)` へアニメーション

### SessionScreen

**追加 state**

```typescript
const [paused, setPaused] = useState(false);
```

**CountdownTimer への `running` 変更**

```typescript
// 変更前
<CountdownTimer running={running} ... />
// 変更後
<CountdownTimer running={running && !paused} ... />
```

**`advance` 関数の変更**

```typescript
function advance() {
  setPaused(false); // 一時停止をリセット
  // 既存の遷移ロジックはそのまま
}
```

**一時停止ボタン**

- 配置: タイマーリングの直下（`ScrollView` 内、`descriptionJa` の上）
- アイコン: ⏸（一時停止中）/ ▶（再生中）、テキストで表現
- スタイル: 中央揃え、グリーン系テキスト

## アニメーション詳細

- `stroke-dashoffset` の変化は `Animated.timing`（duration: 300ms, useNativeDriver: false）
- `running` が false になったとき（一時停止・遷移中）はアニメーションを止める（`Animated.timing.stop()`）
- `durationSeconds` が変わったとき（次のストレッチへ遷移時）は `dashoffset` を 0 にリセット

## 依存

```bash
expo install react-native-svg
```

Expo Managed Workflow 対応のため、追加設定不要。既存の `jest` transform 設定にも `react-native-svg` が含まれているため、テストへの影響なし。

## テスト方針

`CountdownTimer` のアニメーション自体は UI テスト対象外（ビジュアル検証のみ）。
以下を手動確認：

1. タイマーが残り時間に応じてリングが縮む
2. ⏸ タップでタイマーが止まり、▶ タップで再開される
3. スキップボタンで次のストレッチへ進み、一時停止がリセットされる
4. 最後のストレッチが終わると完了画面へ遷移する
5. `useKeepAwake` による画面ロック防止は引き続き機能する
