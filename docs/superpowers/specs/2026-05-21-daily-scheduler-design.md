# デイリースケジューラー 設計仕様

## 概要

インターバルベースの1日のストレッチスケジュールを自動管理し、時間が経ちすぎた場合にアプリ起動時・通知タップ時に強制ストレッチ画面（ゲート）を表示する。

## 目標

- 1日 N 回、X 時間おきにストレッチを促す
- アプリを開いたとき・通知タップ時に強制ストレッチ画面でゲート
- 動作時間帯（デフォルト 8:00〜22:00）の外では発動しない
- スキップは1日1回だけ可能（3秒の遅延表示）

## 変更ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/types/index.ts` | 修正 | `SchedulerConfig` 型追加、`RootStackParamList` に `Gate` 追加 |
| `src/store/useUserStore.ts` | 修正 | `schedulerConfig`, `lastStretchCompletedAt`, `dailySkipUsed`, `lastSkipDate` state 追加 |
| `src/utils/scheduler.ts` | 新規 | ゲート条件判定・インターバル計算ロジック |
| `src/screens/GateScreen.tsx` | 新規 | 強制ストレッチ画面 |
| `src/navigation/index.tsx` | 修正 | ゲート条件チェックを追加 |
| `src/screens/SettingsScreen.tsx` | 修正 | スケジューラー設定 UI 追加 |
| `src/notifications/index.ts` | 修正 | 完了後の動的リスケジュール関数追加 |

---

## 詳細設計

### 型定義

```typescript
// src/types/index.ts に追加
export interface SchedulerConfig {
  enabled: boolean;
  dailyCount: number;       // 1日の回数（1〜5）、デフォルト: 3
  activeHoursStart: string; // "HH:MM" 形式、デフォルト: "08:00"
  activeHoursEnd: string;   // "HH:MM" 形式、デフォルト: "22:00"
}
```

`intervalHours` は `SchedulerConfig` には持たず `activeHours / dailyCount` で毎回計算する。

`RootStackParamList` に `Gate: undefined` を追加。

---

### Store 追加 state（`useUserStore`）

```typescript
schedulerConfig: SchedulerConfig;         // 上記デフォルト値
lastStretchCompletedAt: string | null;    // ISO 8601 or null
dailySkipUsed: boolean;                   // 本日スキップ済みか
lastSkipDate: string | null;              // "YYYY-MM-DD"（日付リセット用）
```

アクション:
- `setSchedulerConfig(config: SchedulerConfig): void`
- `recordStretchCompletion(): void` — `lastStretchCompletedAt = now`, `dailySkipUsed = false` にリセット（日付が変わっていれば）
- `recordSkip(): void` — `dailySkipUsed = true`, `lastSkipDate = today`

---

### スケジューラーロジック（`src/utils/scheduler.ts`）

```typescript
export function calcIntervalHours(config: SchedulerConfig): number
// activeHours = end - start（時間単位）
// return activeHours / dailyCount

export function isWithinActiveHours(config: SchedulerConfig, now: Date): boolean
// now が activeHoursStart 〜 activeHoursEnd 内かどうか

export function shouldShowGate(
  lastStretchCompletedAt: string | null,
  config: SchedulerConfig,
  now?: Date
): boolean
// !config.enabled → false
// !isWithinActiveHours → false
// lastStretchCompletedAt === null → true（初回）
// (now - lastStretchCompletedAt) >= intervalHours → true

export function calcNextStretchTime(
  lastCompletedAt: string,
  config: SchedulerConfig,
  now?: Date
): Date
// lastCompletedAt + intervalHours
// 結果が activeHoursEnd を超えていたら翌日の activeHoursStart に繰り越し
```

---

### GateScreen

**表示内容:**
- タイトル「ストレッチの時間です」
- サブテキスト「前回から X 時間 Y 分経ちました」
- 処方されたストレッチ名リスト（`getPrescription()` で生成、最大3種）
- 「今すぐストレッチする」ボタン → `Session` 画面へ遷移
- 「スキップ（本日あと X 回）」テキスト → 3秒後に表示、`dailySkipUsed` が true なら非表示

**ゲート通過条件:**
1. Session 画面でストレッチ完了 → `recordStretchCompletion()` → `Main` へ navigate
2. スキップタップ → `recordSkip()` → `Main` へ navigate（1日1回のみ）

**Session 完了後の処理（`GateScreen` 起点の場合）:**
- `CompletionScreen` → 完了 → `Main` へ replace（`Gate` をスタックから除去）

---

### Navigation ゲートチェック（`src/navigation/index.tsx`）

```typescript
// RootNavigator 内
const lastStretchCompletedAt = useUserStore(s => s.lastStretchCompletedAt);
const schedulerConfig = useUserStore(s => s.schedulerConfig);
const gateNeeded = shouldShowGate(lastStretchCompletedAt, schedulerConfig);

// スタック構成:
// onboardingCompleted = false → Onboarding のみ
// onboardingCompleted = true, gateNeeded = true → Gate が先頭
// onboardingCompleted = true, gateNeeded = false → Main が先頭
```

`gateNeeded` は `shouldShowGate` の戻り値をそのまま使う。state が更新されると自動的にスタックが切り替わる。

---

### SettingsScreen 追加 UI

```
── スケジューラー ─────────────────
スケジューラー              [ON/OFF]
1日の回数        [1] [2] [3★] [4] [5]
動作時間帯        08:00  〜  22:00
次のストレッチ     あと 2時間34分
──────────────────────────────────
```

- ON/OFF トグルで `schedulerConfig.enabled` を更新
- 回数・時間帯変更時に通知をキャンセル＆リスケジュール
- 「次のストレッチ」は `calcNextStretchTime()` で計算してリアルタイム表示

---

### 通知リスケジュール（`src/notifications/index.ts` 追加）

```typescript
export async function scheduleNextStretchNotification(
  lastCompletedAt: string,
  config: SchedulerConfig
): Promise<void>
// calcNextStretchTime で次回時刻を算出
// cancelAllScheduledNotificationsAsync → scheduleNotificationAsync（1件）
// 通知文: 「ストレッチの時間です！前回から X 時間経ちました 💪」
```

呼び出しタイミング:
1. `recordStretchCompletion()` の直後（`CompletionScreen` の mount 時 — ゲート経由・通常セッション問わず全完了に対して呼ぶ）
2. `setSchedulerConfig()` の直後（設定変更時）

---

## デフォルト値

| 設定 | デフォルト |
|---|---|
| enabled | true（初回からオン） |
| dailyCount | 3 |
| activeHoursStart | "08:00" |
| activeHoursEnd | "22:00" |
| intervalHours（計算値） | 14 / 3 ≈ 4.7 時間 |

---

## スキップ管理

- `dailySkipUsed: boolean` — 本日スキップ済み
- `lastSkipDate: string | null` — "YYYY-MM-DD"
- `recordSkip()` の中で `lastSkipDate !== today` なら `dailySkipUsed = false` にリセットしてから `true` にセット
- `shouldShowGate()` はスキップ状態を考慮しない（スキップ後も次のインターバルで再発動）

---

## テスト方針

`src/utils/scheduler.ts` はピュアロジックなのでユニットテスト対象。

テストケース:
- `calcIntervalHours`: 14時間÷3回 ≈ 4.667
- `isWithinActiveHours`: 境界値（8:00ちょうど、22:00ちょうど、7:59、22:01）
- `shouldShowGate`: null → true、インターバル未満 → false、インターバル以上 → true、activeHours外 → false、enabled=false → false
- `calcNextStretchTime`: 通常ケース、activeHoursEnd 超過→翌日繰り越し

UI・通知は手動確認。
