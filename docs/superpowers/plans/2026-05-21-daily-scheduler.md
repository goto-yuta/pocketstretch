# デイリースケジューラー 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** インターバルベースの1日ストレッチスケジュールを自動管理し、時間超過時にアプリ起動で強制ストレッチ画面（ゲート）を表示する。

**Architecture:** `src/utils/scheduler.ts` にピュアなゲート判定ロジックを集約し、`useUserStore` にスケジューラー state を追加する。`RootNavigator` がストア値を監視して Gate/Main を切り替える宣言的パターンを採用。完了・スキップで state が更新されると navigator が自動的に Main を表示する。

**Tech Stack:** React Native + Expo 54、Zustand (persist)、expo-notifications、React Navigation NativeStack

---

## ファイル構成

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/types/index.ts` | 修正 | `SchedulerConfig` 型追加、`RootStackParamList` に `Gate` 追加 |
| `src/utils/scheduler.ts` | 新規 | `calcIntervalHours` / `isWithinActiveHours` / `shouldShowGate` / `calcNextStretchTime` |
| `__tests__/scheduler.test.ts` | 新規 | scheduler ユーティリティのユニットテスト |
| `src/store/useUserStore.ts` | 修正 | `schedulerConfig` / `lastStretchCompletedAt` / `dailySkipUsed` / `lastSkipDate` + 3アクション |
| `__tests__/useUserStore.test.ts` | 修正 | スケジューラー関連 state のテスト追加 |
| `src/notifications/index.ts` | 修正 | `scheduleNextStretchNotification` 追加 |
| `src/screens/GateScreen.tsx` | 新規 | 強制ストレッチ画面（スキップ3秒遅延・1日1回制限） |
| `src/navigation/index.tsx` | 修正 | `gateNeeded` チェックを追加、Gate スクリーン登録 |
| `src/screens/CompletionScreen.tsx` | 修正 | `recordStretchCompletion` + 通知リスケジュール呼び出し |
| `src/screens/SettingsScreen.tsx` | 修正 | スケジューラー設定 UI（有効/無効・回数・時間帯） |

---

## Task 1: SchedulerConfig 型 + scheduler ユーティリティ

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/scheduler.ts`
- Create: `__tests__/scheduler.test.ts`

- [ ] **Step 1: `src/types/index.ts` に型を追加**

既存の `export type RootStackParamList = {` ブロックに `Gate: undefined;` を追加し、ファイル末尾に `SchedulerConfig` を追加する。

```typescript
// RootStackParamList の変更前:
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
};

// RootStackParamList の変更後:
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Gate: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
};
```

ファイル末尾に追加:

```typescript
export interface SchedulerConfig {
  enabled: boolean;
  dailyCount: number;       // 1〜5
  activeHoursStart: string; // "HH:MM"
  activeHoursEnd: string;   // "HH:MM"
}
```

- [ ] **Step 2: `src/utils/scheduler.ts` を作成**

```typescript
import { SchedulerConfig } from '../types';

export function calcIntervalHours(config: SchedulerConfig): number {
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);
  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const activeHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  return activeHours / config.dailyCount;
}

export function isWithinActiveHours(config: SchedulerConfig, now: Date = new Date()): boolean {
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);
  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

export function shouldShowGate(
  lastStretchCompletedAt: string | null,
  config: SchedulerConfig,
  now: Date = new Date()
): boolean {
  if (!config.enabled) return false;
  if (!isWithinActiveHours(config, now)) return false;
  if (lastStretchCompletedAt === null) return true;
  const interval = calcIntervalHours(config);
  const elapsed = (now.getTime() - new Date(lastStretchCompletedAt).getTime()) / (60 * 60 * 1000);
  return elapsed >= interval;
}

export function calcNextStretchTime(
  lastCompletedAt: string,
  config: SchedulerConfig
): Date {
  const interval = calcIntervalHours(config);
  const last = new Date(lastCompletedAt);
  const next = new Date(last.getTime() + interval * 60 * 60 * 1000);

  const [endH, endM] = config.activeHoursEnd.split(':').map(Number);
  const [startH, startM] = config.activeHoursStart.split(':').map(Number);

  const endOfDay = new Date(next);
  endOfDay.setHours(endH, endM, 0, 0);

  if (next >= endOfDay) {
    const tomorrow = new Date(next);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(startH, startM, 0, 0);
    return tomorrow;
  }
  return next;
}
```

- [ ] **Step 3: `__tests__/scheduler.test.ts` のテストを書く**

```typescript
import {
  calcIntervalHours,
  isWithinActiveHours,
  shouldShowGate,
  calcNextStretchTime,
} from '../src/utils/scheduler';
import { SchedulerConfig } from '../src/types';

const defaultConfig: SchedulerConfig = {
  enabled: true,
  dailyCount: 3,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
};

describe('calcIntervalHours', () => {
  it('calculates 14/3 for 08:00-22:00 with dailyCount 3', () => {
    expect(calcIntervalHours(defaultConfig)).toBeCloseTo(14 / 3);
  });
  it('calculates 4 for 09:00-17:00 with dailyCount 2', () => {
    const config = { ...defaultConfig, dailyCount: 2, activeHoursStart: '09:00', activeHoursEnd: '17:00' };
    expect(calcIntervalHours(config)).toBe(4);
  });
});

describe('isWithinActiveHours', () => {
  it('returns true at exactly activeHoursStart', () => {
    const now = new Date(2026, 4, 21, 8, 0, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(true);
  });
  it('returns false at exactly activeHoursEnd', () => {
    const now = new Date(2026, 4, 21, 22, 0, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(false);
  });
  it('returns false one minute before activeHoursStart', () => {
    const now = new Date(2026, 4, 21, 7, 59, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(false);
  });
  it('returns true during active hours', () => {
    const now = new Date(2026, 4, 21, 14, 30, 0);
    expect(isWithinActiveHours(defaultConfig, now)).toBe(true);
  });
});

describe('shouldShowGate', () => {
  const now = new Date(2026, 4, 21, 14, 0, 0);

  it('returns true when lastStretchCompletedAt is null (first use)', () => {
    expect(shouldShowGate(null, defaultConfig, now)).toBe(true);
  });
  it('returns false when interval has not elapsed', () => {
    const recent = new Date(2026, 4, 21, 11, 0, 0).toISOString(); // 3h ago, interval ~4.67h
    expect(shouldShowGate(recent, defaultConfig, now)).toBe(false);
  });
  it('returns true when interval has elapsed', () => {
    const old = new Date(2026, 4, 21, 8, 0, 0).toISOString(); // 6h ago
    expect(shouldShowGate(old, defaultConfig, now)).toBe(true);
  });
  it('returns false outside active hours', () => {
    const outside = new Date(2026, 4, 21, 23, 0, 0);
    expect(shouldShowGate(null, defaultConfig, outside)).toBe(false);
  });
  it('returns false when enabled is false', () => {
    const disabled = { ...defaultConfig, enabled: false };
    expect(shouldShowGate(null, disabled, now)).toBe(false);
  });
});

describe('calcNextStretchTime', () => {
  it('adds intervalHours to lastCompletedAt within active hours', () => {
    const last = new Date(2026, 4, 21, 10, 0, 0).toISOString();
    const result = calcNextStretchTime(last, defaultConfig);
    // 10:00 + (14/3)h ≈ 14:40
    expect(result.getDate()).toBe(21);
    expect(result.getHours()).toBe(14);
  });
  it('rolls over to next day activeHoursStart when result exceeds activeHoursEnd', () => {
    const last = new Date(2026, 4, 21, 20, 0, 0).toISOString();
    const result = calcNextStretchTime(last, defaultConfig);
    // 20:00 + 4.67h = 00:40+1 → next day 08:00
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });
});
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd /Users/goto/.superset/projects/drstretch
npx jest --no-coverage __tests__/scheduler.test.ts
```

Expected: 10 tests passing

- [ ] **Step 5: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/types/index.ts src/utils/scheduler.ts __tests__/scheduler.test.ts
git commit -m "feat: add SchedulerConfig type and scheduler utility"
```

---

## Task 2: Store 拡張

**Files:**
- Modify: `src/store/useUserStore.ts`
- Modify: `__tests__/useUserStore.test.ts`

現在の `useUserStore` の構造:
- `UserProfile` を extends した `UserStore` interface
- `persist` ミドルウェアで AsyncStorage に永続化
- actions: `setBodyParts`, `setScene`, `setSport`, `setNotificationEnabled`, `setNotificationTimes`, `completeOnboarding`, `markStretchesCompleted`

- [ ] **Step 1: `src/store/useUserStore.ts` を以下で完全置換**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, SchedulerConfig, UserProfile } from '../types';

interface DailyProgress {
  date: string;
  completedStretchIds: string[];
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: true,
  dailyCount: 3,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
};

interface UserStore extends UserProfile {
  dailyProgress: DailyProgress;
  lastStretchCompletedAt: string | null;
  dailySkipUsed: boolean;
  lastSkipDate: string | null;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setSport: (sport: string) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  setSchedulerConfig: (config: SchedulerConfig) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
  recordStretchCompletion: () => void;
  recordSkip: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      notificationEnabled: false,
      notificationTimes: [],
      schedulerConfig: DEFAULT_SCHEDULER_CONFIG,
      dailyProgress: { date: '', completedStretchIds: [] },
      lastStretchCompletedAt: null,
      dailySkipUsed: false,
      lastSkipDate: null,
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setSport: (sport) => set({ sport }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      setSchedulerConfig: (schedulerConfig) => set({ schedulerConfig }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markStretchesCompleted: (ids) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const existing =
            state.dailyProgress.date === today ? state.dailyProgress.completedStretchIds : [];
          const merged = Array.from(new Set([...existing, ...ids]));
          return { dailyProgress: { date: today, completedStretchIds: merged } };
        }),
      recordStretchCompletion: () =>
        set({ lastStretchCompletedAt: new Date().toISOString() }),
      recordSkip: () =>
        set(() => {
          const today = new Date().toISOString().slice(0, 10);
          return {
            dailySkipUsed: true,
            lastSkipDate: today,
            lastStretchCompletedAt: new Date().toISOString(),
          };
        }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

注: `recordSkip` で `lastStretchCompletedAt = now` にセットすることで、スキップ後はインターバルがリセットされ Gate が即座に再表示されない。`dailySkipUsed = true` でスキップボタンを当日非表示にする。

- [ ] **Step 2: `__tests__/useUserStore.test.ts` のテストを追加**

既存の `beforeEach` の `setState` に以下を追加（既存フィールドはそのまま残す）:

```typescript
// beforeEach の setState に追加するフィールド
schedulerConfig: {
  enabled: true,
  dailyCount: 3,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
},
lastStretchCompletedAt: null,
dailySkipUsed: false,
lastSkipDate: null,
```

ファイル末尾に以下のテストを追加:

```typescript
describe('setSchedulerConfig', () => {
  it('updates schedulerConfig', () => {
    const { result } = renderHook(() => useUserStore());
    const newConfig = { enabled: false, dailyCount: 2, activeHoursStart: '09:00', activeHoursEnd: '21:00' };
    act(() => result.current.setSchedulerConfig(newConfig));
    expect(result.current.schedulerConfig).toEqual(newConfig);
  });
});

describe('recordStretchCompletion', () => {
  it('sets lastStretchCompletedAt to current time', () => {
    const before = Date.now();
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    const after = Date.now();
    const ts = new Date(result.current.lastStretchCompletedAt!).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('recordSkip', () => {
  it('sets dailySkipUsed to true and records today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordSkip());
    expect(result.current.dailySkipUsed).toBe(true);
    expect(result.current.lastSkipDate).toBe(new Date().toISOString().slice(0, 10));
  });
  it('sets lastStretchCompletedAt to reset the interval timer', () => {
    const before = Date.now();
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordSkip());
    const ts = new Date(result.current.lastStretchCompletedAt!).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});
```

- [ ] **Step 3: テストが全て通ることを確認**

```bash
npx jest --no-coverage __tests__/useUserStore.test.ts
```

Expected: 全テスト通過

- [ ] **Step 4: コミット**

```bash
git add src/store/useUserStore.ts __tests__/useUserStore.test.ts
git commit -m "feat: add scheduler state and actions to useUserStore"
```

---

## Task 3: 通知リスケジュール関数

**Files:**
- Modify: `src/notifications/index.ts`
- Modify: `__tests__/notifications.test.ts`

- [ ] **Step 1: `src/notifications/index.ts` に `scheduleNextStretchNotification` を追加**

既存のインポートと関数はそのまま残し、ファイル末尾に追加:

```typescript
import { SchedulerConfig } from '../types';
import { calcIntervalHours, calcNextStretchTime } from '../utils/scheduler';

export async function scheduleNextStretchNotification(
  lastCompletedAt: string,
  config: SchedulerConfig
): Promise<void> {
  const next = calcNextStretchTime(lastCompletedAt, config);
  const hours = Math.round(calcIntervalHours(config));
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ストレッチの時間です！',
      body: `前回から約${hours}時間経ちました 💪`,
      data: { screen: 'Gate' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next,
    },
  });
}
```

- [ ] **Step 2: `__tests__/notifications.test.ts` にテストを追加**

既存テストの末尾に追加:

```typescript
import { scheduleNextStretchNotification } from '../src/notifications';
import { SchedulerConfig } from '../src/types';

describe('scheduleNextStretchNotification', () => {
  it('exports without throwing (smoke test)', () => {
    expect(typeof scheduleNextStretchNotification).toBe('function');
  });
});
```

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 4: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/notifications/index.ts __tests__/notifications.test.ts
git commit -m "feat: add scheduleNextStretchNotification"
```

---

## Task 4: GateScreen

**Files:**
- Create: `src/screens/GateScreen.tsx`

- [ ] **Step 1: `src/screens/GateScreen.tsx` を作成**

```typescript
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_STRETCHES } from '../data/stretches';
import { scheduleNextStretchNotification } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';
import { getPrescription } from '../utils/prescription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GateScreen() {
  const navigation = useNavigation<Nav>();
  const {
    bodyParts, scene, sport,
    schedulerConfig, lastStretchCompletedAt,
    dailySkipUsed, recordSkip,
  } = useUserStore();
  const [skipVisible, setSkipVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSkipVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined);
  const stretchIds = prescription.stretchIds.slice(0, 3);

  const elapsedText = lastStretchCompletedAt
    ? (() => {
        const totalHours = (Date.now() - new Date(lastStretchCompletedAt).getTime()) / (1000 * 60 * 60);
        const h = Math.floor(totalHours);
        const m = Math.floor((totalHours - h) * 60);
        return `前回から ${h} 時間 ${m} 分経ちました`;
      })()
    : '今日最初のストレッチです';

  function handleStart() {
    navigation.navigate('Session', { stretchIds });
  }

  async function handleSkip() {
    recordSkip();
    await scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig);
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ストレッチの時間です</Text>
      <Text style={styles.elapsed}>{elapsedText}</Text>
      <View style={styles.list}>
        {stretchIds.map((id) => {
          const stretch = ALL_STRETCHES.find((s) => s.id === id);
          return stretch ? (
            <Text key={id} style={styles.item}>・{stretch.nameJa}</Text>
          ) : null;
        })}
      </View>
      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startText}>▶  今すぐストレッチする</Text>
      </TouchableOpacity>
      {skipVisible && !dailySkipUsed && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>スキップ（本日あと 1 回）</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  elapsed: { fontSize: 14, color: '#888', marginBottom: 32 },
  list: { marginBottom: 32, alignSelf: 'stretch' },
  item: { fontSize: 16, color: '#555', marginBottom: 10 },
  startBtn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16,
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  skipBtn: { marginTop: 8 },
  skipText: { fontSize: 14, color: '#aaa' },
});
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/screens/GateScreen.tsx
git commit -m "feat: add GateScreen for mandatory stretch gate"
```

---

## Task 5: Navigation ゲートチェック

**Files:**
- Modify: `src/navigation/index.tsx`

現在の `RootNavigator` は `onboardingCompleted` の値で Onboarding / Main を切り替えている。ここに `gateNeeded` の分岐を追加する。

- [ ] **Step 1: `src/navigation/index.tsx` を以下で完全置換**

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useUserStore } from '../store/useUserStore';
import { MainTabParamList, OnboardingStackParamList, RootStackParamList } from '../types';
import { shouldShowGate } from '../utils/scheduler';
import Step1BodyParts from '../screens/onboarding/Step1BodyParts';
import Step2Scene from '../screens/onboarding/Step2Scene';
import Step3Sport from '../screens/onboarding/Step3Sport';
import Step4Notifications from '../screens/onboarding/Step4Notifications';
import GateScreen from '../screens/GateScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionScreen from '../screens/SessionScreen';
import CompletionScreen from '../screens/CompletionScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Step1" component={Step1BodyParts} />
      <OnboardingStack.Screen name="Step2" component={Step2Scene} />
      <OnboardingStack.Screen name="Step3Sport" component={Step3Sport} />
      <OnboardingStack.Screen name="Step4" component={Step4Notifications} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);
  const lastStretchCompletedAt = useUserStore((s) => s.lastStretchCompletedAt);
  const schedulerConfig = useUserStore((s) => s.schedulerConfig);
  const gateNeeded = shouldShowGate(lastStretchCompletedAt, schedulerConfig);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            {gateNeeded && (
              <RootStack.Screen
                name="Gate"
                component={GateScreen}
                options={{ gestureEnabled: false }}
              />
            )}
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Session"
              component={SessionScreen}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <RootStack.Screen name="Completion" component={CompletionScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
```

`gateNeeded` が true のとき Gate がスタックの先頭になる。`recordStretchCompletion()` または `recordSkip()` が呼ばれてストアが更新されると `shouldShowGate` が false を返し、Gate がスタックから消えて Main が表示される。

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 4: コミット**

```bash
git add src/navigation/index.tsx
git commit -m "feat: wire gate check into RootNavigator"
```

---

## Task 6: CompletionScreen — 完了時の処理追加

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

`useEffect` 内で `markStretchesCompleted` に加えて `recordStretchCompletion` と通知リスケジュールを呼ぶ。ゲート経由・通常セッション問わず全完了に適用する。

- [ ] **Step 1: `src/screens/CompletionScreen.tsx` を以下で完全置換**

```typescript
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleNextStretchNotification } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Completion'>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    markStretchesCompleted,
    recordStretchCompletion,
    schedulerConfig,
  } = useUserStore();

  useEffect(() => {
    markStretchesCompleted(route.params.completedStretchIds);
    recordStretchCompletion();
    const now = new Date().toISOString();
    scheduleNextStretchNotification(now, schedulerConfig).catch(() => {});
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

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 4: コミット**

```bash
git add src/screens/CompletionScreen.tsx
git commit -m "feat: call recordStretchCompletion and reschedule notification on session complete"
```

---

## Task 7: SettingsScreen — スケジューラー設定 UI

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

時間帯は `+`/`−` ボタンで1時間単位で調整（新たな依存パッケージ不要）。回数は1〜5のボタン選択。

- [ ] **Step 1: `src/screens/SettingsScreen.tsx` を以下で完全置換**

```typescript
import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleNextStretchNotification } from '../notifications';
import { cancelAllNotifications, requestPermissions, scheduleNotifications } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { SchedulerConfig } from '../types';
import { calcNextStretchTime } from '../utils/scheduler';

const SCENE_LABEL: Record<string, string> = {
  office: 'オフィス向け', home: '自宅ライト', serious: '本格ケア',
};
const BODY_LABEL: Record<string, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

function formatCountdown(nextDate: Date): string {
  const diff = nextDate.getTime() - Date.now();
  if (diff <= 0) return 'もうすぐ';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `あと ${h} 時間 ${m} 分`;
}

function adjustHour(timeStr: string, delta: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const newH = ((h + delta + 24) % 24);
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const {
    notificationEnabled, notificationTimes,
    setNotificationEnabled, setNotificationTimes,
    bodyParts, scene,
    schedulerConfig, setSchedulerConfig,
    lastStretchCompletedAt,
  } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!lastStretchCompletedAt || !schedulerConfig.enabled) {
      setCountdown('');
      return;
    }
    const next = calcNextStretchTime(lastStretchCompletedAt, schedulerConfig);
    setCountdown(formatCountdown(next));
    const id = setInterval(() => setCountdown(formatCountdown(next)), 60000);
    return () => clearInterval(id);
  }, [lastStretchCompletedAt, schedulerConfig]);

  async function toggleNotifications(value: boolean) {
    if (value) {
      setLoading(true);
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          '通知が許可されていません',
          '設定アプリから通知を許可してください',
          [{ text: '設定を開く', onPress: () => Linking.openSettings() }, { text: 'キャンセル' }]
        );
        setLoading(false);
        return;
      }
      const times = notificationTimes.length > 0 ? notificationTimes : ['09:00', '13:00', '18:00'];
      await scheduleNotifications(times);
      setNotificationEnabled(true);
      setNotificationTimes(times);
      setLoading(false);
    } else {
      await cancelAllNotifications();
      setNotificationEnabled(false);
    }
  }

  async function updateSchedulerConfig(update: Partial<SchedulerConfig>) {
    const newConfig = { ...schedulerConfig, ...update };
    setSchedulerConfig(newConfig);
    if (newConfig.enabled && lastStretchCompletedAt) {
      await scheduleNextStretchNotification(lastStretchCompletedAt, newConfig).catch(() => {});
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>設定</Text>

      <Text style={styles.sectionTitle}>スケジューラー</Text>
      <View style={styles.row}>
        <Text style={styles.label}>スケジューラー</Text>
        <Switch
          value={schedulerConfig.enabled}
          onValueChange={(v) => updateSchedulerConfig({ enabled: v })}
        />
      </View>

      {schedulerConfig.enabled && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>1日の回数</Text>
            <View style={styles.countPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, schedulerConfig.dailyCount === n && styles.countBtnActive]}
                  onPress={() => updateSchedulerConfig({ dailyCount: n })}
                >
                  <Text style={[styles.countBtnText, schedulerConfig.dailyCount === n && styles.countBtnTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>動作時間帯</Text>
            <View style={styles.timePicker}>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursStart: adjustHour(schedulerConfig.activeHoursStart, -1) })}>
                <Text style={styles.timeAdj}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeVal}>{schedulerConfig.activeHoursStart}</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursStart: adjustHour(schedulerConfig.activeHoursStart, 1) })}>
                <Text style={styles.timeAdj}>＋</Text>
              </TouchableOpacity>
              <Text style={styles.timeSep}>〜</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursEnd: adjustHour(schedulerConfig.activeHoursEnd, -1) })}>
                <Text style={styles.timeAdj}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeVal}>{schedulerConfig.activeHoursEnd}</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursEnd: adjustHour(schedulerConfig.activeHoursEnd, 1) })}>
                <Text style={styles.timeAdj}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>

          {countdown !== '' && (
            <Text style={styles.sub}>次のストレッチ: {countdown}</Text>
          )}
        </>
      )}

      <Text style={styles.sectionTitle}>通知</Text>
      <View style={styles.row}>
        <Text style={styles.label}>通知</Text>
        <Switch value={notificationEnabled} onValueChange={toggleNotifications} disabled={loading} />
      </View>
      {notificationEnabled && (
        <Text style={styles.sub}>通知時刻: {notificationTimes.join('  ')}</Text>
      )}

      <Text style={styles.sectionTitle}>現在のプロフィール</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>シーン</Text>
        <Text style={styles.infoValue}>{SCENE_LABEL[scene]}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>気になる部位</Text>
        <Text style={styles.infoValue}>{bodyParts.map((b) => BODY_LABEL[b]).join('・')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#888', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  label: { fontSize: 16, color: '#333' },
  sub: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 4 },
  countPicker: { flexDirection: 'row', gap: 6 },
  countBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  countBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  countBtnText: { fontSize: 15, color: '#555' },
  countBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeAdj: { fontSize: 20, color: '#4CAF50', fontWeight: 'bold', paddingHorizontal: 4 },
  timeVal: { fontSize: 15, color: '#333', minWidth: 44, textAlign: 'center' },
  timeSep: { fontSize: 14, color: '#999' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  infoLabel: { fontSize: 15, color: '#555' },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '600' },
});
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: エラーなし

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 4: コミット**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add scheduler settings UI to SettingsScreen"
```

---

## Self-Review

**スペックカバレッジ:**
- ✅ インターバルベース（activeHours / dailyCount） → Task 1 `calcIntervalHours`
- ✅ 起動時ゲートチェック → Task 5 `RootNavigator`
- ✅ 通知タップでゲート → Task 4 `data: { screen: 'Gate' }` + Task 3
- ✅ activeHours 外は発動しない → Task 1 `isWithinActiveHours`
- ✅ スキップ1日1回・3秒遅延 → Task 4 `GateScreen`
- ✅ スキップ後インターバルリセット → Task 2 `recordSkip` で `lastStretchCompletedAt = now`
- ✅ 完了時 `recordStretchCompletion` + 通知リスケジュール → Task 6 `CompletionScreen`
- ✅ 設定: 回数・時間帯・有効/無効 → Task 7 `SettingsScreen`
- ✅ デフォルト: enabled=true, 3回, 8:00-22:00 → Task 2 `DEFAULT_SCHEDULER_CONFIG`

**型整合性:**
- `SchedulerConfig` → Task 1 で定義、Task 2/3/4/5/6/7 で参照 ✅
- `calcIntervalHours`, `calcNextStretchTime`, `shouldShowGate`, `isWithinActiveHours` → Task 1 で定義、以降で使用 ✅
- `recordStretchCompletion`, `recordSkip`, `setSchedulerConfig` → Task 2 で定義、Task 4/6/7 で使用 ✅
- `scheduleNextStretchNotification` → Task 3 で定義、Task 4/6/7 で使用 ✅
- `Gate: undefined` → Task 1 で `RootStackParamList` に追加、Task 5 で Screen 登録 ✅
