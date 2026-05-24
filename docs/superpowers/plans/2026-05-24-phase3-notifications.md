# Phase 3: 通知の一本化 + タップ遷移 + 権限堅牢化 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** リマインダー機構をスケジューラ（Gate）方式に一本化し、固定時刻系を撤去。通知タップで Gate→Session に確実に遷移させ、通知権限フローを iOS/Android 両対応で堅牢化し、スケジューラ設定の不正値クラッシュを防ぐ。

**Architecture:** scheduler 系（`scheduleNextStretchNotification`＋`shouldShowGate`＋`GateScreen`）を唯一の通知エンジンにする。固定時刻系（`scheduleNotifications`/`notificationEnabled`/`notificationTimes`）を撤去。`navigationRef` を介して通知応答ハンドラ（cold/warm）と `AppState` 復帰で Gate へ遷移、Gate は常時登録し不要時は Main へ自己リダイレクト。権限は `getPermissionsAsync` の三分岐に。

**Tech Stack:** TypeScript, React Native, Expo SDK 54, expo-notifications, React Navigation v7, Zustand, Jest。

**親仕様:** `docs/superpowers/specs/2026-05-24-pre-launch-hardening-design.md`（WS1・WS2）。

**前提:** ブランチ `pre-launch-hardening`。Phase 1・2 完了（HEAD `a4fef19`）。`npx jest` 180テスト緑。

**SDK54 API（確認済み）:**
- `getPermissionsAsync()`/`requestPermissionsAsync()` → `{ granted: boolean, canAskAgain: boolean, status, ... }`。
- `getLastNotificationResponseAsync(): Promise<NotificationResponse | null>`（cold start）。
- `addNotificationResponseReceivedListener(cb): EventSubscription`、`subscription.remove()`。`response.notification.request.content.data`。
- `SchedulableTriggerInputTypes.DAILY {hour,minute}` / `DATE {date}`。

**現状の通知2系統（撤去対象＝固定時刻系）:**
- 固定時刻系: `scheduleNotifications(times)`/`buildDailyTriggers`/`parseTimeString`（notifications）、`notificationEnabled`/`notificationTimes`（store/types）、Settings「通知」セクション、Step4 の3時刻カード。`data.screen='Session'`。
- スケジューラ系（残す）: `scheduleNextStretchNotification(lastCompletedAt, config)`（`data.screen='Gate'`、`DATE`トリガ）。呼び出し元: CompletionScreen / GateScreen skip / Settings scheduler変更。

---

### Task 1: scheduler の不正窓ガード（クラッシュ防止）

**Files:** Modify `src/utils/scheduler.ts`; Test `__tests__/scheduler.test.ts`（追記）。

`calcIntervalHours` は `dailyCount<=0` で throw するが、`activeHoursStart >= activeHoursEnd` だと `activeHours<=0` となり負/0/NaN を返しうる。ガードと、Settings が使う純粋バリデータ `isValidActiveWindow` を足す。

- [ ] **Step 1: テスト追記（失敗するはず）** — `__tests__/scheduler.test.ts` の末尾に追記（既存 import に `calcIntervalHours` があれば再利用、無ければ追加）:

```typescript
import { calcIntervalHours, isValidActiveWindow } from '../src/utils/scheduler';

describe('calcIntervalHours guards', () => {
  it('throws when active window is non-positive (start >= end)', () => {
    expect(() =>
      calcIntervalHours({ enabled: true, dailyCount: 3, activeHoursStart: '22:00', activeHoursEnd: '08:00' }),
    ).toThrow(RangeError);
  });
});

describe('isValidActiveWindow', () => {
  it('accepts a normal window', () => {
    expect(isValidActiveWindow('08:00', '22:00')).toBe(true);
  });
  it('rejects start >= end', () => {
    expect(isValidActiveWindow('22:00', '22:00')).toBe(false);
    expect(isValidActiveWindow('22:00', '08:00')).toBe(false);
  });
  it('requires at least a 1-hour window', () => {
    expect(isValidActiveWindow('08:00', '08:30')).toBe(false);
    expect(isValidActiveWindow('08:00', '09:00')).toBe(true);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/scheduler.test.ts` → FAIL（`isValidActiveWindow` 未定義／throwしない）。

- [ ] **Step 3: 実装** — `src/utils/scheduler.ts`:
  - `calcIntervalHours` の `dailyCount` ガードの直後に追加（`const activeHours = ...` 計算の後、`return` の前）:
```typescript
  if (activeHours <= 0) {
    throw new RangeError(`active window must be positive, got start=${config.activeHoursStart} end=${config.activeHoursEnd}`);
  }
```
  - ファイル末尾に追加:
```typescript
/** 動作時間帯が有効か（start < end かつ最低1時間）。Settings の調整で不正値を弾くのに使う。 */
export function isValidActiveWindow(start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin - startMin >= 60;
}
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/scheduler.test.ts` → PASS。
- [ ] **Step 5: 全テスト + コミット** — `npx jest` 後:
```bash
git add src/utils/scheduler.ts __tests__/scheduler.test.ts
git commit -m "fix: guard scheduler against non-positive active window

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 通知権限の堅牢化ヘルパー（WS2）

**Files:** Modify `src/notifications/index.ts`（`ensureNotificationPermission` 追加。既存は残す）; Test `__tests__/notifications.test.ts`（追記）。

- [ ] **Step 1: テスト追記（失敗するはず）** — `__tests__/notifications.test.ts` の末尾に追記:

```typescript
import * as Notifications from 'expo-notifications';
import { ensureNotificationPermission } from '../src/notifications';

describe('ensureNotificationPermission', () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns 'granted' when already granted (no re-request)", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: true, canAskAgain: true } as any);
    const req = jest.spyOn(Notifications, 'requestPermissionsAsync');
    await expect(ensureNotificationPermission()).resolves.toBe('granted');
    expect(req).not.toHaveBeenCalled();
  });

  it("requests when undetermined and returns the request result", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ granted: true, canAskAgain: true } as any);
    await expect(ensureNotificationPermission()).resolves.toBe('granted');
  });

  it("returns 'denied' when the request is rejected", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: true } as any);
    await expect(ensureNotificationPermission()).resolves.toBe('denied');
  });

  it("returns 'blocked' when not granted and cannot ask again", async () => {
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ granted: false, canAskAgain: false } as any);
    const req = jest.spyOn(Notifications, 'requestPermissionsAsync');
    await expect(ensureNotificationPermission()).resolves.toBe('blocked');
    expect(req).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/notifications.test.ts -t ensureNotificationPermission` → FAIL。

- [ ] **Step 3: 実装** — `src/notifications/index.ts` に追加（既存 `requestPermissions` はこの段では残す。撤去は Task 4）:
```typescript
export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

/**
 * 通知権限を確実化する。
 * - 既に許可済み: 'granted'（再リクエストしない）
 * - 未決定（canAskAgain）: リクエストして結果を返す
 * - 拒否済みで再要求不可: 'blocked'（呼び出し側で設定アプリへ誘導）
 */
export async function ensureNotificationPermission(): Promise<PermissionOutcome> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (current.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    return req.granted ? 'granted' : 'denied';
  }
  return 'blocked';
}
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/notifications.test.ts` → PASS。
- [ ] **Step 5: 全テスト + コミット**:
```bash
git add src/notifications/index.ts __tests__/notifications.test.ts
git commit -m "feat: add ensureNotificationPermission with three-way permission check

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Step4・Settings をスケジューラ一本化に切替（固定時刻系の使用をやめる）

固定時刻系の **使用** をやめ、スケジューラのみにする。この段では store/types/notifications の旧シンボルは残置（撤去は Task 4）。これにより各段でビルド緑を保つ。

**Files:** Modify `src/screens/onboarding/Step4Notifications.tsx`, `src/screens/SettingsScreen.tsx`。Test: `__tests__/screens/Step4Notifications.test.tsx`（新規）。

- [ ] **Step 1: Step4 のテストを書く（失敗するはず）** — Create `__tests__/screens/Step4Notifications.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Step4Notifications from '../../src/screens/onboarding/Step4Notifications';

const mockComplete = jest.fn();
const mockSetEnabledSched = jest.fn();
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: () => ({
    completeOnboarding: mockComplete,
    schedulerConfig: { enabled: true, dailyCount: 3, activeHoursStart: '08:00', activeHoursEnd: '22:00' },
    setSchedulerConfig: mockSetEnabledSched,
  }),
}));
jest.mock('../../src/notifications', () => ({
  ensureNotificationPermission: jest.fn().mockResolvedValue('granted'),
  scheduleNextStretchNotification: jest.fn().mockResolvedValue(undefined),
}));

test('有効化ボタンで権限確認しオンボーディングを完了する', async () => {
  const { getByText } = render(<Step4Notifications />);
  fireEvent.press(getByText('通知を有効にする'));
  await waitFor(() => expect(mockComplete).toHaveBeenCalled());
});

test('スキップでもオンボーディングを完了する', () => {
  const { getByText } = render(<Step4Notifications />);
  fireEvent.press(getByText('スキップ'));
  expect(mockComplete).toHaveBeenCalled();
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/screens/Step4Notifications.test.tsx` → FAIL。

- [ ] **Step 3: Step4 を書き換え** — `src/screens/onboarding/Step4Notifications.tsx` 全文を以下に置換:

```tsx
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import PrimaryButton from '../../components/PrimaryButton';
import { ensureNotificationPermission, scheduleNextStretchNotification } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';
import { Colors, Radius, Shadow } from '../../styles/tokens';

export default function Step4Notifications() {
  const { completeOnboarding, schedulerConfig, setSchedulerConfig } = useUserStore();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      const outcome = await ensureNotificationPermission();
      if (outcome === 'blocked') {
        Alert.alert(
          '通知が許可されていません',
          '設定アプリから通知を許可してください',
          [{ text: '設定を開く', onPress: () => Linking.openSettings() }, { text: 'あとで' }],
        );
        completeOnboarding();
        return;
      }
      if (outcome === 'granted') {
        setSchedulerConfig({ ...schedulerConfig, enabled: true });
        await scheduleNextStretchNotification(new Date().toISOString(), { ...schedulerConfig, enabled: true });
      } else {
        // denied: スケジューラは無効化して進む
        setSchedulerConfig({ ...schedulerConfig, enabled: false });
      }
      completeOnboarding();
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    setSchedulerConfig({ ...schedulerConfig, enabled: false });
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar current={4} total={4} />
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>
        毎日 {schedulerConfig.activeHoursStart}〜{schedulerConfig.activeHoursEnd} の間に、{schedulerConfig.dailyCount}回お知らせします
      </Text>
      <View style={[styles.infoCard, Shadow.card]}>
        <Text style={styles.infoText}>回数や時間帯は、あとから設定でいつでも変更できます。</Text>
      </View>
      <PrimaryButton
        label={loading ? '設定中...' : '通知を有効にする'}
        onPress={handleEnable}
        disabled={loading}
        style={styles.button}
      />
      <Text style={styles.skip} onPress={handleSkip}>スキップ</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 32,
  },
  infoText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  button: { marginBottom: 16 },
  skip: { textAlign: 'center', color: Colors.textMuted, fontSize: 15, paddingVertical: 8 },
});
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/screens/Step4Notifications.test.tsx` → PASS。

- [ ] **Step 5: Settings を書き換え** — `src/screens/SettingsScreen.tsx`:
  - import を変更: `scheduleNotifications`/`cancelAllNotifications`/`requestPermissions` の代わりに `ensureNotificationPermission`/`cancelAllNotifications`/`scheduleNextStretchNotification` を使う。行6を:
```typescript
import { cancelAllNotifications, ensureNotificationPermission, scheduleNextStretchNotification } from '../notifications';
```
  - import に `isValidActiveWindow` を追加: `import { calcNextStretchTime, isValidActiveWindow } from '../utils/scheduler';`
  - `useUserStore()` 分割代入から `notificationEnabled, notificationTimes, setNotificationEnabled, setNotificationTimes` を削除（`schedulerConfig, setSchedulerConfig, bodyParts, scene, lastStretchCompletedAt` は残す）。
  - `toggleNotifications` 関数を削除。
  - `updateSchedulerConfig` を次に置換（enabled切替時に権限確認＆スケジュール／OFFでキャンセル、時間帯の不正値を弾く）:
```typescript
  async function updateSchedulerConfig(update: Partial<SchedulerConfig>) {
    const candidate = { ...schedulerConfig, ...update };
    // 動作時間帯の不正値（start>=end / 1時間未満）は弾く
    if (!isValidActiveWindow(candidate.activeHoursStart, candidate.activeHoursEnd)) return;

    if (update.enabled === true) {
      setLoading(true);
      try {
        const outcome = await ensureNotificationPermission();
        if (outcome === 'blocked') {
          Alert.alert(
            '通知が許可されていません',
            '設定アプリから通知を許可してください',
            [{ text: '設定を開く', onPress: () => Linking.openSettings() }, { text: 'あとで' }],
          );
          return; // トグルは ON にしない
        }
        if (outcome !== 'granted') return;
      } finally {
        setLoading(false);
      }
    }

    setSchedulerConfig(candidate);

    if (!candidate.enabled) {
      await cancelAllNotifications();
      return;
    }
    const anchor = lastStretchCompletedAt ?? new Date().toISOString();
    await scheduleNextStretchNotification(anchor, candidate).catch(() => {});
  }
```
  - JSX: 「スケジューラー」セクションのラベルを「ストレッチ通知」に変更（`<Text style={styles.sectionTitle}>スケジューラー</Text>` → `ストレッチ通知`、行内の `<Text style={styles.label}>スケジューラー</Text>` → `通知`）。`disabled={loading}` を scheduler のトグルにも付ける。
  - JSX: 旧「通知」セクション（`<Text style={styles.sectionTitle}>通知</Text>` から `notificationEnabled` の Switch と `notificationTimes` 表示の `)}` まで、行151-164相当）を**丸ごと削除**。
  - `formatCountdown`/countdown表示・プロフィール・disclaimer はそのまま。

- [ ] **Step 6: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/screens/onboarding/Step4Notifications.tsx src/screens/SettingsScreen.tsx __tests__/screens/Step4Notifications.test.tsx
git commit -m "feat: consolidate notifications onto scheduler in onboarding and settings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 固定時刻系のデッドコード撤去

Step4/Settings が使わなくなった固定時刻系を型・ストア・通知から撤去する。

**Files:** Modify `src/types/index.ts`, `src/store/useUserStore.ts`, `src/notifications/index.ts`; Tests: `__tests__/useUserStore.test.ts`, `__tests__/notifications.test.ts`。

- [ ] **Step 1: 先にテストから旧シンボルを除去（RED 期待）**
  - `__tests__/notifications.test.ts`: `parseTimeString` / `buildDailyTriggers` を import・参照しているテストケースを削除（`scheduleNextStretchNotification` と `ensureNotificationPermission` のテストは残す）。
  - `__tests__/useUserStore.test.ts`: `describe('useUserStore')` の `beforeEach` から `notificationEnabled: false,` と `notificationTimes: [],` を削除。`'sets notification times'` テスト（`setNotificationTimes` を呼ぶもの）を削除。`describe('setSport')` の beforeEach にある `notificationEnabled`/`notificationTimes` も削除。
  - この時点で `npx jest` を走らせると、まだ実装側に旧シンボルがあるのでテストは緑のはず（参照を消しただけ）。確認だけする。

- [ ] **Step 2: 型から撤去** — `src/types/index.ts` の `UserProfile` から2行を削除:
```typescript
  notificationEnabled: boolean;
  notificationTimes: string[];
```

- [ ] **Step 3: ストアから撤去** — `src/store/useUserStore.ts`:
  - `UserStore` interface から `setNotificationEnabled` / `setNotificationTimes` の宣言を削除。
  - 初期 state から `notificationEnabled: false,` と `notificationTimes: [],` を削除。
  - `setNotificationEnabled` / `setNotificationTimes` の実装行を削除。

- [ ] **Step 4: 通知モジュールから撤去** — `src/notifications/index.ts`:
  - `scheduleNotifications`、`buildDailyTriggers`、`parseTimeString`、`requestPermissions` を削除。
  - `scheduleNextStretchNotification` 内で `parseTimeString` を使っていないこと（scheduler 側の `calcNextStretchTime` を使用）を確認。残すのは `ensureNotificationPermission`/`scheduleNextStretchNotification`/`cancelAllNotifications`。

- [ ] **Step 5: 型エラー掃き出し + テスト** — `npx tsc --noEmit`（もし projectにあれば）または `npx jest` を実行し、旧シンボル参照によるエラーがゼロであることを確認。`grep -rn "notificationEnabled\|notificationTimes\|scheduleNotifications\|buildDailyTriggers\|requestPermissions\b" src/ __tests__/` が空（`scheduleNextStretchNotification` はヒット可）であることを確認。緑なら:
```bash
git add src/types/index.ts src/store/useUserStore.ts src/notifications/index.ts __tests__/useUserStore.test.ts __tests__/notifications.test.ts
git commit -m "refactor: remove dead fixed-time notification code

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 通知タップ→Gate 遷移 + Gate 常時登録 + cold/AppState 配線

**Files:** Modify `src/navigation/index.tsx`, `src/App.tsx`(=`App.tsx`), `src/screens/GateScreen.tsx`。Test: `__tests__/navigation.test.ts`（新規・純粋判定のみ）。

設計:
- `navigation/index.tsx`: `navigationRef` を作成し `NavigationContainer` に渡す。Gate を**常時登録**（条件レンダリングをやめ Main を初期ルートに）。Gate へ遷移すべきか判定して遷移する純関数＋ヘルパー `goToGateIfDue()` を export。
- `App.tsx`: 通知応答（cold=`getLastNotificationResponseAsync`、warm=listener）で `data.screen` を読み Gate へ。`AppState` 'active' で `goToGateIfDue()`。
- `GateScreen`: 表示時に `shouldShowGate` が false なら `Main` へ置換（誤遷移時の自己修復）。

- [ ] **Step 1: 純粋判定のテストを書く（失敗するはず）** — Create `__tests__/navigation.test.ts`:

```typescript
import { shouldNavigateToGateFromState } from '../src/navigation';

const cfg = { enabled: true, dailyCount: 3, activeHoursStart: '00:00', activeHoursEnd: '23:59' };

describe('shouldNavigateToGateFromState', () => {
  it('returns false before onboarding', () => {
    expect(shouldNavigateToGateFromState(false, null, cfg)).toBe(false);
  });
  it('returns true when onboarded and a gate is due (no completion yet)', () => {
    expect(shouldNavigateToGateFromState(true, null, cfg)).toBe(true);
  });
  it('returns false when scheduler disabled', () => {
    expect(shouldNavigateToGateFromState(true, null, { ...cfg, enabled: false })).toBe(false);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/navigation.test.ts` → FAIL。

- [ ] **Step 3: navigation/index.tsx を実装** —
  - import 追加（`AppState` は App.tsx 側でのみ使用するのでここでは入れない）:
```typescript
import { createNavigationContainerRef } from '@react-navigation/native';
import { shouldShowGate } from '../utils/scheduler';
```
（`RootStackParamList` と `SchedulerConfig` は `../types` から。既存 import に `RootStackParamList` があるので `SchedulerConfig` を追記。`useUserStore` は既に import 済み。）
  - ファイル上部（`RootStack` 定義の近く）に追加:
```typescript
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** オンボ済み・スケジューラ有効・Gate 期限到来なら true（純粋判定）。 */
export function shouldNavigateToGateFromState(
  onboardingCompleted: boolean,
  lastStretchCompletedAt: string | null,
  schedulerConfig: SchedulerConfig,
  now: Date = new Date(),
): boolean {
  if (!onboardingCompleted) return false;
  return shouldShowGate(lastStretchCompletedAt, schedulerConfig, now);
}

/** 期限到来なら Gate へ遷移（cold/AppState 復帰時に呼ぶ）。 */
export function goToGateIfDue(): void {
  if (!navigationRef.isReady()) return;
  const { onboardingCompleted, lastStretchCompletedAt, schedulerConfig } = useUserStore.getState();
  if (shouldNavigateToGateFromState(onboardingCompleted, lastStretchCompletedAt, schedulerConfig)) {
    navigationRef.navigate('Gate');
  }
}
```
  - `NavigationContainer` に `ref={navigationRef}` と `onReady={goToGateIfDue}` を付与。
  - 認証済みスタックの `Gate` を**条件レンダリングから常時登録に変更**: `{gateNeeded && (...)}` をやめ、`Main` を先頭（初期ルート）に、その後 `Gate`/`Session`/`Completion`/`EditScene`/`EditBodyParts` を登録。`gateNeeded`/`shouldShowGate` 由来のローカル変数とその import 使用箇所を削除（`shouldShowGate` は上の純関数経由で使用）。Gate のオプションは現状維持（`gestureEnabled: false`）。

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/navigation.test.ts` → PASS。

- [ ] **Step 5: App.tsx を実装** — `App.tsx` を以下に置換:

```tsx
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import RootNavigator, { navigationRef, goToGateIfDue } from './src/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function navigateFromResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const screen = (response.notification.request.content.data as { screen?: string })?.screen;
  if (screen === 'Gate' || screen === 'Session') {
    if (navigationRef.isReady()) navigationRef.navigate('Gate');
  }
}

export default function App() {
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // cold start: アプリが通知タップで起動した場合
    Notifications.getLastNotificationResponseAsync().then(navigateFromResponse);
    // warm: 起動中のタップ
    responseListener.current = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    // フォアグラウンド復帰時に Gate 期限を判定
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') goToGateIfDue();
    });
    return () => {
      responseListener.current?.remove();
      sub.remove();
    };
  }, []);

  return <RootNavigator />;
}
```
注: `getLastNotificationResponseAsync` の遷移は `navigationRef.isReady()` 前に呼ばれる可能性があるため、その場合は `navigation` の `onReady`→`goToGateIfDue()` が cold-start のゲート表示を担保する（通知 data があり期限内なら Gate に出る）。両経路とも GateScreen の自己修復ガード（Step6）で誤表示を防ぐ。

- [ ] **Step 6: GateScreen に自己修復ガード** — `src/screens/GateScreen.tsx`:
  - import 追加: `import { shouldShowGate } from '../utils/scheduler';`、`useEffect` を React import に追加。
  - コンポーネント先頭（`skipVisible` の useEffect 付近）に追加:
```typescript
  useEffect(() => {
    if (!shouldShowGate(lastStretchCompletedAt, schedulerConfig)) {
      navigation.navigate('Main');
    }
  }, [lastStretchCompletedAt, schedulerConfig, navigation]);
```
  （`lastStretchCompletedAt` と `schedulerConfig` は既に store から取得済み。）

- [ ] **Step 7: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/navigation/index.tsx App.tsx src/screens/GateScreen.tsx __tests__/navigation.test.ts
git commit -m "feat: navigate to Gate on notification tap, app-active, and cold start

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: 手動確認（必須・自動テスト外）** — 実機/シミュレータで: ①オンボで通知有効化→通知許可ダイアログ ②スケジュール通知発火→タップで Gate→Session ③Gate完了後すぐ再度開いても Gate が出ない（自己修復）④設定で通知OFF→通知が止まる。`/run` で起動できる。

---

## Self-Review

**Spec coverage（WS1/WS2）:**
- 通知一本化（固定時刻系撤去） → Task 3（使用停止）+ Task 4（撤去）✓
- 通知タップ→Gate遷移 → Task 5 ✓
- Gate 常時登録＋cold/AppState → Task 5 ✓
- GateScreen 自己修復 → Task 5 Step6 ✓
- scheduler 不正窓ガード → Task 1 ✓
- 権限三分岐（getPermissionsAsync） → Task 2 + Task 3（呼び出し）✓
- オンボ Step4 をスケジューラ設定へ → Task 3 ✓
- Settings の通知統合 → Task 3 ✓

**順序の健全性:** 各タスク終了時にビルド/テスト緑。Task3 で旧シンボルの「使用」を止め、Task4 で「定義」を撤去するため、中間状態でも参照エラーが出ない。

**Placeholder scan:** なし。

**Type consistency:** `PermissionOutcome`（'granted'|'denied'|'blocked'）を notifications で定義し Step4/Settings で分岐。`navigationRef`/`goToGateIfDue`/`shouldNavigateToGateFromState` を navigation で定義し App.tsx で使用。`isValidActiveWindow` を scheduler で定義し Settings で使用。`scheduleNextStretchNotification(anchor, config)` の引数順は既存と一致。

**留意/リスク:**
- Task 5 の通知タップ→遷移とcold-start・AppState配線は**自動テスト困難**（ネイティブ依存）。純粋判定 `shouldNavigateToGateFromState` のみ単体テストし、結合は Step8 の手動確認で担保する。
- 固定時刻系フィールド撤去後も、旧ユーザーの persist データには `notificationEnabled` 等が残るが未使用なso無害（version 据え置きで可）。
- 既存の `__tests__/notifications.test.ts` の現行内容（parseTimeString/buildDailyTriggers のテスト有無）は実ファイルを読んで該当ケースのみ除去すること。
- 引き継ぎ: Phase 1 で出た「Settings が ScrollView 無しで免責が小画面で切れる懸念」は、本Phaseで Settings を編集する機会に、必要なら全体を `ScrollView` で包む対応を検討（必須ではないが望ましい）。
