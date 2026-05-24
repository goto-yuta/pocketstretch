# Phase 2: リテンション基盤（ストリーク＋ローカル日付＋migrate） — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完了履歴に基づく連続日数（ストリーク）・累計回数を記録・表示し、日付計算をローカル基準に統一して、永続化のマイグレーションを入れる。

**Architecture:** ストリーク遷移を純関数 `src/utils/streak.ts` に切り出してユニットテスト。ローカル日付は `src/utils/date.ts` に集約し、UTC基準の `toISOString().slice(0,10)` を全置換。ストアにストリークフィールドを追加し `recordStretchCompletion` で更新、`persist` に `version`/`migrate` を付与。CompletionScreen と HomeScreen で表示。

**Tech Stack:** TypeScript, React Native, Expo SDK 54, Zustand + persist(AsyncStorage), Jest + @testing-library/react-native。

**親仕様:** `docs/superpowers/specs/2026-05-24-pre-launch-hardening-design.md`（WS5）。

**前提:** ブランチ `pre-launch-hardening`。Phase 1 完了済み（HEAD `51937b5`）。`npx jest` 163テスト緑。

**現状の関連コード（main基準）:**
- `src/store/useUserStore.ts`: `dailyProgress`/`lastStretchCompletedAt`/`dailySkipUsed`/`lastSkipDate` は `UserStore` interface に宣言（`UserProfile` ではない）。`markStretchesCompleted`(L56-63) と `recordSkip`(L66-74) が `new Date().toISOString().slice(0,10)` を使用。`recordStretchCompletion`(L64-65) は `lastStretchCompletedAt` のみ設定。`persist` 設定(L76-79)は `name`/`storage` のみ。
- `src/screens/GateScreen.tsx:21`: `const today = new Date().toISOString().slice(0, 10);`
- `src/screens/CompletionScreen.tsx`: `useEffect([])` で `markStretchesCompleted(ids)` → `recordStretchCompletion()` → `scheduleNextStretchNotification(...)`。表示は種目数と分のみ。
- `src/screens/HomeScreen.tsx`: greeting セクションあり。`useUserStore()` から分割代入。
- `__tests__/useUserStore.test.ts`: L80 が `new Date().toISOString().slice(0,10)` で日付検証。

---

### Task 1: ローカル日付ユーティリティ + UTC日付の全置換

**Files:**
- Create: `src/utils/date.ts`
- Test: `__tests__/date.test.ts`（新規）
- Modify: `src/store/useUserStore.ts`（L58, L68 の日付計算）
- Modify: `src/screens/GateScreen.tsx`（L21）
- Modify: `__tests__/useUserStore.test.ts`（L80 の期待値）

- [ ] **Step 1: テストを書く（失敗するはず）** — Create `__tests__/date.test.ts`:

```typescript
import { getLocalDateString } from '../src/utils/date';

describe('getLocalDateString', () => {
  it('formats a given date as local YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 24, 23, 30); // 2026-05-24 23:30 ローカル
    expect(getLocalDateString(d)).toBe('2026-05-24');
  });

  it('uses the local calendar day at start of day', () => {
    const d = new Date(2026, 0, 1, 0, 30); // 2026-01-01 00:30 ローカル
    expect(getLocalDateString(d)).toBe('2026-01-01');
  });

  it('defaults to now', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(getLocalDateString()).toBe(expected);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/date.test.ts` → FAIL（モジュール無し）。

- [ ] **Step 3: 実装** — Create `src/utils/date.ts`:

```typescript
/** ローカルタイムゾーン基準の YYYY-MM-DD 文字列を返す。 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/date.test.ts` → PASS。

- [ ] **Step 5: ストアの UTC 日付を置換** — `src/store/useUserStore.ts`:
- import 追加（先頭の import 群に）: `import { getLocalDateString } from '../utils/date';`
- `markStretchesCompleted` 内の `const today = new Date().toISOString().slice(0, 10);` を `const today = getLocalDateString();` に変更。
- `recordSkip` 内の `const today = new Date().toISOString().slice(0, 10);` を `const today = getLocalDateString();` に変更。
（`lastStretchCompletedAt: new Date().toISOString()` は完全なタイムスタンプなので変更しない。）

- [ ] **Step 6: GateScreen の UTC 日付を置換** — `src/screens/GateScreen.tsx`:
- import 追加: `import { getLocalDateString } from '../utils/date';`
- L21 `const today = new Date().toISOString().slice(0, 10);` を `const today = getLocalDateString();` に変更。

- [ ] **Step 7: 既存ストアテストの期待値を更新** — `__tests__/useUserStore.test.ts` の `'sets date to today'` テスト（L77-82）:
- import 追加（ファイル先頭）: `import { getLocalDateString } from '../src/utils/date';`
- `const today = new Date().toISOString().slice(0, 10);` を `const today = getLocalDateString();` に変更。

- [ ] **Step 8: 全テスト + コミット** — `npx jest`（緑のまま）後:
```bash
git add src/utils/date.ts __tests__/date.test.ts src/store/useUserStore.ts src/screens/GateScreen.tsx __tests__/useUserStore.test.ts
git commit -m "fix: use local date instead of UTC for daily progress and gate

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ストリーク純関数 + ストアフィールド + recordStretchCompletion + persist migrate

**Files:**
- Create: `src/utils/streak.ts`
- Test: `__tests__/streak.test.ts`（新規）
- Modify: `src/store/useUserStore.ts`（フィールド追加・`recordStretchCompletion` 拡張・`persist` に version/migrate）
- Modify: `__tests__/useUserStore.test.ts`（beforeEach にフィールド追加・ストリークテスト追記）

- [ ] **Step 1: ストリーク純関数のテストを書く（失敗するはず）** — Create `__tests__/streak.test.ts`:

```typescript
import { nextStreakState, streakMessage, StreakState } from '../src/utils/streak';

const base: StreakState = { currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null };

describe('nextStreakState', () => {
  it('starts a streak at 1 on first completion', () => {
    expect(nextStreakState(base, '2026-05-24')).toEqual({
      currentStreak: 1, longestStreak: 1, totalSessions: 1, lastCompletedDate: '2026-05-24',
    });
  });

  it('increments on a consecutive day', () => {
    const prev: StreakState = { currentStreak: 3, longestStreak: 3, totalSessions: 5, lastCompletedDate: '2026-05-23' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 4, longestStreak: 4, totalSessions: 6, lastCompletedDate: '2026-05-24',
    });
  });

  it('keeps streak but counts the session on a same-day repeat', () => {
    const prev: StreakState = { currentStreak: 4, longestStreak: 4, totalSessions: 6, lastCompletedDate: '2026-05-24' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 4, longestStreak: 4, totalSessions: 7, lastCompletedDate: '2026-05-24',
    });
  });

  it('resets to 1 after a gap', () => {
    const prev: StreakState = { currentStreak: 9, longestStreak: 9, totalSessions: 20, lastCompletedDate: '2026-05-20' };
    expect(nextStreakState(prev, '2026-05-24')).toEqual({
      currentStreak: 1, longestStreak: 9, totalSessions: 21, lastCompletedDate: '2026-05-24',
    });
  });

  it('preserves longestStreak when current is lower', () => {
    const prev: StreakState = { currentStreak: 1, longestStreak: 10, totalSessions: 30, lastCompletedDate: '2026-05-22' };
    expect(nextStreakState(prev, '2026-05-24').longestStreak).toBe(10);
  });
});

describe('streakMessage', () => {
  it('celebrates 30+ days', () => { expect(streakMessage(30)).toContain('30'); });
  it('celebrates 7+ days', () => { expect(streakMessage(7)).toContain('1週間'); });
  it('returns a non-empty message on day 1', () => { expect(streakMessage(1).length).toBeGreaterThan(0); });
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/streak.test.ts` → FAIL。

- [ ] **Step 3: 実装** — Create `src/utils/streak.ts`:

```typescript
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastCompletedDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 完了1回ぶんを反映した新しいストリーク状態を返す。
 * today は getLocalDateString() の YYYY-MM-DD。
 * - 同じ日にもう一度完了: セッション数のみ +1、連続日数は据え置き
 * - 前日からの連続: currentStreak +1
 * - それ以外（初回 or 間隔が空いた）: currentStreak = 1
 */
export function nextStreakState(prev: StreakState, today: string): StreakState {
  if (prev.lastCompletedDate === today) {
    return { ...prev, totalSessions: prev.totalSessions + 1 };
  }
  const diffDays = prev.lastCompletedDate
    ? Math.round((Date.parse(today) - Date.parse(prev.lastCompletedDate)) / DAY_MS)
    : null;
  const currentStreak = diffDays === 1 ? prev.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    totalSessions: prev.totalSessions + 1,
    lastCompletedDate: today,
  };
}

/** 完了画面で見せる連続日数の祝福コピー。 */
export function streakMessage(currentStreak: number): string {
  if (currentStreak >= 30) return '30日連続達成！本当にすごい 🎉';
  if (currentStreak >= 7) return '1週間継続中！その調子 🔥';
  if (currentStreak === 1) return 'はじめの一歩、ナイス！';
  return 'この調子で続けよう！';
}
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/streak.test.ts` → PASS。

- [ ] **Step 5: ストアにフィールド追加・recordStretchCompletion 拡張・migrate** — `src/store/useUserStore.ts`:

import 追加:
```typescript
import { nextStreakState, StreakState } from '../utils/streak';
```
（`getLocalDateString` は Task 1 で import 済み。）

`UserStore` interface に追加（`dailyProgress` などの近くに）:
```typescript
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastCompletedDate: string | null;
```

初期 state に追加（`lastStretchCompletedAt: null,` の近く）:
```typescript
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastCompletedDate: null,
```

`recordStretchCompletion` を次のように差し替え:
```typescript
      recordStretchCompletion: () =>
        set((state) => {
          const prev: StreakState = {
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
            totalSessions: state.totalSessions,
            lastCompletedDate: state.lastCompletedDate,
          };
          const next = nextStreakState(prev, getLocalDateString());
          return { ...next, lastStretchCompletedAt: new Date().toISOString() };
        }),
```

`persist` の第2引数オブジェクト（`name`/`storage` があるところ）に追加:
```typescript
      version: 1,
      migrate: (persisted: any, _version: number) => {
        if (persisted && persisted.currentStreak === undefined) {
          return {
            ...persisted,
            currentStreak: 0,
            longestStreak: 0,
            totalSessions: 0,
            lastCompletedDate: null,
          };
        }
        return persisted;
      },
```

- [ ] **Step 6: ストアテストを更新（失敗するはず→実装済みなので成功するが、まず追記分の RED を見る）**

`__tests__/useUserStore.test.ts`:
- 先頭付近に import 追加: `import { getLocalDateString } from '../src/utils/date';`（Task1で追加済みなら重複させない）。
- `describe('useUserStore')` の `beforeEach` の `setState` に新フィールドを追加（既存フィールドの後ろ）:
```typescript
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastCompletedDate: null,
```
- 新しい describe を追記:
```typescript
describe('recordStretchCompletion streak tracking', () => {
  beforeEach(() => {
    useUserStore.setState({ currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null });
  });

  it('starts the streak at 1 on first completion today', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalSessions).toBe(1);
    expect(result.current.lastCompletedDate).toBe(getLocalDateString());
  });

  it('does not advance the streak twice on the same day', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalSessions).toBe(2);
  });

  it('increments the streak when yesterday was completed', () => {
    const yesterday = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    useUserStore.setState({ currentStreak: 4, longestStreak: 4, totalSessions: 9, lastCompletedDate: yesterday });
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.recordStretchCompletion());
    expect(result.current.currentStreak).toBe(5);
    expect(result.current.longestStreak).toBe(5);
  });
});
```

- [ ] **Step 7: 実行して成功を確認** — `npx jest __tests__/useUserStore.test.ts` → PASS。

- [ ] **Step 8: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/utils/streak.ts __tests__/streak.test.ts src/store/useUserStore.ts __tests__/useUserStore.test.ts
git commit -m "feat: track streak, longest streak, and total sessions on completion

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 完了画面とホーム画面にストリーク表示

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Test: `__tests__/screens/CompletionStreak.test.tsx`（新規）

- [ ] **Step 1: 完了画面のストリーク表示テストを書く（失敗するはず）** — Create `__tests__/screens/CompletionStreak.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import CompletionScreen from '../../src/screens/CompletionScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { completedStretchIds: ['neck-side'] } }),
}));
jest.mock('../../src/notifications', () => ({
  scheduleNextStretchNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: () => ({
    markStretchesCompleted: jest.fn(),
    recordStretchCompletion: jest.fn(),
    schedulerConfig: { enabled: true, dailyCount: 3, activeHoursStart: '08:00', activeHoursEnd: '22:00' },
    currentStreak: 5,
    totalSessions: 12,
  }),
}));

test('完了画面に連続日数と累計回数が表示される', () => {
  const { getByText } = render(<CompletionScreen />);
  expect(getByText('🔥 5日連続')).toBeTruthy();
  expect(getByText('12回')).toBeTruthy();
});
```

- [ ] **Step 2: 実行して失敗を確認** — `npx jest __tests__/screens/CompletionStreak.test.tsx` → FAIL。

- [ ] **Step 3: CompletionScreen を実装** — `src/screens/CompletionScreen.tsx`:

import 追加:
```typescript
import { streakMessage } from '../utils/streak';
```

`useUserStore` の分割代入に `currentStreak`, `totalSessions` を追加:
```typescript
  const { markStretchesCompleted, recordStretchCompletion, schedulerConfig, currentStreak, totalSessions } = useUserStore();
```

`<Text style={styles.sub}>継続することが大切です</Text>` を、ストリーク表示に差し替え（その行を削除し、以下を挿入）:
```tsx
      <Text style={styles.streak}>🔥 {currentStreak}日連続</Text>
      <Text style={styles.sub}>{streakMessage(currentStreak)}</Text>
```

`statsRow` の中に3枚目のカードを追加（既存の「種目」「セッション」カードの後ろ、`</View>` の直前）:
```tsx
        <View style={[styles.statCard, Shadow.card]}>
          <Text style={styles.statValue}>{totalSessions}回</Text>
          <Text style={styles.statLabel}>累計</Text>
        </View>
```

`styles` に追加:
```typescript
  streak: { fontSize: 20, fontWeight: '700', color: Colors.primaryDeep, marginBottom: 4 },
```

- [ ] **Step 4: 実行して成功を確認** — `npx jest __tests__/screens/CompletionStreak.test.tsx` → PASS。

- [ ] **Step 5: HomeScreen にストリークバッジ** — `src/screens/HomeScreen.tsx`:

`useUserStore()` 分割代入に `currentStreak` を追加:
```typescript
  const { bodyParts, scene, sport, dailyProgress, currentStreak } = useUserStore();
```

greeting ブロック内（`<Text style={styles.greetingSub}>今日もケアを続けよう</Text>` の直後）に追加:
```tsx
          {currentStreak > 0 && (
            <Text style={styles.streakBadge}>🔥 {currentStreak}日連続</Text>
          )}
```

`styles` に追加:
```typescript
  streakBadge: { fontSize: 13, fontWeight: '700', color: Colors.primaryDeep, marginTop: 2 },
```

- [ ] **Step 6: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/screens/CompletionScreen.tsx src/screens/HomeScreen.tsx __tests__/screens/CompletionStreak.test.tsx
git commit -m "feat: show streak and total sessions on completion and home screens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage（WS5）:**
- ストリーク/累計/最長 をストアに追加 → Task 2 ✓
- ローカル日付ヘルパー + UTC全置換（dailyProgress含む） → Task 1 ✓
- ストリーク判定（今日据置/昨日+1/それ以前リセット） → Task 2（`nextStreakState`）✓
- CompletionScreen 表示（🔥N日連続・累計・祝福文） → Task 3 ✓
- HomeScreen 小バッジ → Task 3 ✓
- persist version + migrate → Task 2 ✓

**Placeholder scan:** なし。全 step に実コード・実コマンド。

**Type consistency:** `StreakState`（streak.ts）→ `nextStreakState`/store で同型参照。`getLocalDateString`（date.ts）→ store/GateScreen/tests で同名。`currentStreak`/`longestStreak`/`totalSessions`/`lastCompletedDate` の4フィールド名は store interface・初期state・migrate・テスト・画面で一致。`recordStretchCompletion` は引数なしのまま（既存呼び出し箇所 CompletionScreen と互換）。

**留意:**
- `recordStretchCompletion` は完了時のみ呼ばれ、`recordSkip`（スキップ）はストリークを進めない（設計どおり）。
- CompletionScreen テストは `useUserStore` をセレクタ無し呼び出しでモック（実画面が `useUserStore()` を分割代入で使うため）。実画面の呼び出し形と一致していることを実装時に確認。
