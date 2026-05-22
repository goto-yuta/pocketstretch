# UIUX Redesign — Warm Wellness

**Date:** 2026-05-22
**Scope:** 全画面ビジュアルポリッシュ（デザイントークン導入 + Warm Wellnessパレット適用）

---

## 概要

PocketStretch の全画面を「Warm Wellness」ビジュアル方向性でリデザインする。
グリーンを廃止し、テラコッタ×クリームパレットで統一する。
カラー・スペーシングをデザイントークンファイルに集約することで、将来の変更を1ファイルで完結させる。

---

## デザイントークン (`src/styles/tokens.ts`)

```ts
export const Colors = {
  primary:       '#E8874A',  // テラコッタ — CTA・アクセント
  primaryDeep:   '#D4614A',  // 濃いテラコッタ — グラデーション終端
  primaryLight:  '#FFE5CC',  // 淡いテラコッタ — 選択状態背景
  bgMain:        '#FFF8F2',  // クリーム — 全画面の背景
  bgCard:        '#FFFFFF',  // ホワイト — カード背景
  bgAccent:      '#FDF0E6',  // やや濃いクリーム — 画像プレースホルダー等
  textPrimary:   '#3D1F0A',  // ディープブラウン — 見出し
  textSecondary: '#8B6555',  // ウォームミッド — 本文
  textMuted:     '#C8A898',  // ミュートウォーム — キャプション・ラベル
  border:        '#F0DDD4',  // ウォームボーダー
}

export const Radius = {
  sm:   8,
  md:   14,
  lg:   18,
  full: 999,
}

export const Shadow = {
  card: {
    shadowColor: '#E8874A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#E8874A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
}
```

CTAボタンは `linear-gradient(135deg, primary → primaryDeep)` で統一する。

---

## 画面別変更仕様

### HomeScreen

| 要素 | Before | After |
|------|--------|-------|
| 背景 | `#fff` | `Colors.bgMain` |
| 進捗ラベル | グレー小文字 | `textMuted` + `uppercase` + `letter-spacing` |
| 進捗数値 | `#1B5E20` | `textPrimary` |
| プログレスバー背景 | `#E8F5E9` | `primaryLight` |
| プログレスバー | `#4CAF50` | `primary → primaryDeep` グラデーション |
| CTAボタン | `#2E7D32` ベタ塗り | `primary → primaryDeep` グラデーション + `Shadow.button` |
| 完了状態 | `#E8F5E9` 背景 | `bgCard` カード + `primaryLight` バッジ |
| サブボタン | `#C8E6C9` ボーダー | `border` カラー + `bgCard` 背景 |
| グリーティング | なし | 「おはようございます 👋」＋サブテキスト追加 |

進捗数値は `bgCard` + `Shadow.card` のカードに包む。

---

### SessionScreen

| 要素 | Before | After |
|------|--------|-------|
| 背景 | `#fff` | `Colors.bgMain` |
| タイマーリング | グリーン | `primary` テラコッタ、背景トラック `primaryLight` |
| タイマー数値 | `#2E7D32` | `Colors.primary` |
| 一時停止ボタン | テキストのみ | `bgCard` カード + `border` ボーダー |
| スキップボタン | 右下 absolute | 一時停止ボタンと同行に並べる（right-align） |
| 終了ボタン | `#F44336` 赤 | `primaryDeep` |
| ストレッチ名サブテキスト | なし | 部位ラベル（`textMuted`）を名前直下に追加 |
| 説明・手順エリア | スクロール内 | 上部スクロールと分離してボーダートップで区切り |

---

### CompletionScreen

| 要素 | Before | After |
|------|--------|-------|
| 背景 | `#fff` | `Colors.bgMain` |
| CTAボタン | `#4CAF50` | `primary → primaryDeep` グラデーション |
| 統計カード | なし | 種目数・セッション時間のミニカード2枚（`bgCard` + `border`） |

---

### GateScreen

| 要素 | Before | After |
|------|--------|-------|
| 背景 | `#fff` | `Colors.bgMain` |
| ストレッチ一覧 | 裸のテキスト | `bgCard` カードに包む |
| 絵文字 | なし | `🧘` をヘッダーに追加 |
| 開始ボタン | `#4CAF50` | `primary → primaryDeep` グラデーション |
| スキップテキスト | `#aaa` | `textMuted` |

---

### Onboarding（Step1〜Step4）

**全ステップ共通:**
- 上部にステップバー追加: 完了済み `primary`、未完了 `primaryLight`、4セグメント
- ステップ番号テキスト（`textMuted`、右揃え）

**Step1（部位選択）:**
- 背景: `bgMain`
- チップ未選択: `border` ボーダー
- チップ選択済み: `primary` ボーダー + `primaryLight` 背景 + `primaryDeep` テキスト

**Step2（シーン）:**
- 背景: `bgMain`
- カード: `bgCard` + `border` ボーダー
- 選択中カード: `primary` ボーダー（2px）

**Step3（スポーツ）:**
- 背景: `bgMain`
- 入力フィールド: `border` ボーダー
- サジェストアイテム: `border` セパレーター

**Step4（通知）:**
- 時間表示をタップ可能な時間ピッカー風カードに変更（各時間が `bgCard` + `primary` ボーダー）
- タップでネイティブTimePicker（`@react-native-community/datetimepicker`）を呼び出す
- 「次へ」は `primary → primaryDeep` グラデーション

---

### SettingsScreen

| 要素 | Before | After |
|------|--------|-------|
| 背景 | `#fff` | `Colors.bgMain` |
| セクションタイトル | `#888` | `textMuted` + `uppercase` + `letter-spacing` |
| 行区切り | `#eee` | `border` |
| Switch ON色 | システムデフォルト | `primary`（`trackColor` 設定） |
| プロフィール（シーン・部位） | 読み取り専用テキスト | `›` 付きの編集可能行（タップ → 対応オンボーディング画面に遷移） |

プロフィール行タップ時の遷移:
- `RootStackParamList` に `EditScene` と `EditBodyParts` ルートを追加（モーダル表示）
- シーン行 → `EditScene` 画面（Step2Scene と同じ UI、選択後 `navigation.goBack()` で設定に戻る）
- 部位行 → `EditBodyParts` 画面（Step1BodyParts と同じ UI、同上）
- 既存のオンボーディング画面は変更せず、Edit用の薄いラッパー画面として実装する

---

## 実装方針

1. `src/styles/tokens.ts` を新規作成し、全カラー・Radius・Shadow定数を定義
2. 各画面の `StyleSheet` を tokens に差し替え（1画面ずつ順番に）
3. Step4 の通知時間ピッカー化（`@react-native-community/datetimepicker` 追加）
4. Settings のプロフィール編集遷移（navigation パラメータで `fromSettings` フラグ）
5. Onboarding ステップバーコンポーネント（`OnboardingProgressBar`）を共通化

---

## 対象外（この仕様には含まない）

- ストリーク・習慣ログ表示
- ダークモード
- アニメーション・マイクロインタラクションの追加
- イラスト素材の差し替え

---

## ファイル変更一覧（予定）

```
src/styles/tokens.ts                        ← 新規
src/screens/HomeScreen.tsx
src/screens/SessionScreen.tsx
src/screens/CompletionScreen.tsx
src/screens/GateScreen.tsx
src/screens/SettingsScreen.tsx
src/screens/onboarding/Step1BodyParts.tsx
src/screens/onboarding/Step2Scene.tsx
src/screens/onboarding/Step3Sport.tsx
src/screens/onboarding/Step4Notifications.tsx
src/components/OnboardingProgressBar.tsx    ← 新規
src/screens/EditScene.tsx                   ← 新規（Step2Scene のラッパー）
src/screens/EditBodyParts.tsx               ← 新規（Step1BodyParts のラッパー）
src/navigation/index.tsx                    ← EditScene/EditBodyParts ルート追加
src/types/index.ts                          ← RootStackParamList に EditScene/EditBodyParts 追加
package.json / package-lock.json            ← datetimepicker 追加
```
