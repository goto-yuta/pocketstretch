# Phase 4 (鍵不要部分): レビュー依頼 + アクセシビリティ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** セッション完了の好タイミングでストアレビューを依頼（`expo-store-review`、OS依存・認証不要）し、主要操作要素にアクセシビリティ属性を付与する。

**Architecture:** レビュー依頼可否は純関数 `shouldRequestReview` に切り出してユニットテスト。`lastReviewRequestAt` をストアに追加（persist version 2 + migrate）。CompletionScreen が完了時に1度だけ依頼。a11y は共有 `PrimaryButton` と主要タッチ要素に `accessibilityRole`/`accessibilityLabel` を付与。

**Tech Stack:** TypeScript, React Native, Expo SDK 54, expo-store-review, Zustand, Jest。

**親仕様:** `docs/superpowers/specs/2026-05-24-pre-launch-hardening-design.md`（WS6 のうち鍵不要分）。

**前提:** ブランチ `pre-launch-hardening`。Phase 1–3 完了（HEAD `4b1edbf`）。`npx jest` 192テスト緑。**Sentry / EAS Update はユーザー認証情報待ちのため本Phase対象外。**

**現状参照:**
- `src/store/useUserStore.ts`: `totalSessions: number`（Phase2導入済）あり。`persist` は `version: 1` + version 判定式 migrate（`fromVersion < 1`）。
- `src/screens/CompletionScreen.tsx`: `useUserStore()` から `schedulerConfig, currentStreak, totalSessions` を取得。`useEffect([])` で `scheduleNextStretchNotification` を呼ぶ。`totalSessions` は SessionScreen 側で完了記録済みなので CompletionScreen マウント時には更新後の値。
- `src/components/PrimaryButton.tsx`: `TouchableOpacity` + `LinearGradient`、props `{label,onPress,disabled,style}`。
- 手動モック方針: `__mocks__/expo-notifications.js` に倣い、expo モジュールは手動モックを置く。

---

### Task 1: expo-store-review によるレビュー依頼

**Files:**
- Create: `src/utils/review.ts`, `__tests__/review.test.ts`, `__mocks__/expo-store-review.js`
- Modify: `src/store/useUserStore.ts`, `src/screens/CompletionScreen.tsx`, `__tests__/useUserStore.test.ts`, `__tests__/screens/CompletionStreak.test.tsx`
- Install: `expo-store-review`

- [ ] **Step 1: 依存を追加** — `npx expo install expo-store-review`（SDK54対応版が入る）。`package.json` に追加されたことを確認。

- [ ] **Step 2: 純関数テスト（失敗するはず）** — Create `__tests__/review.test.ts`:
```typescript
import { shouldRequestReview } from '../src/utils/review';

describe('shouldRequestReview', () => {
  it('does not ask before 3 completed sessions', () => {
    expect(shouldRequestReview(2, null)).toBe(false);
  });
  it('asks at 3 sessions when never asked before', () => {
    expect(shouldRequestReview(3, null)).toBe(true);
  });
  it('asks beyond 3 sessions when never asked', () => {
    expect(shouldRequestReview(10, null)).toBe(true);
  });
  it('does not ask again once already asked', () => {
    expect(shouldRequestReview(10, '2026-05-01T00:00:00.000Z')).toBe(false);
  });
});
```

- [ ] **Step 3:** `npx jest __tests__/review.test.ts` → FAIL.

- [ ] **Step 4: 実装** — Create `src/utils/review.ts`:
```typescript
const MIN_SESSIONS_FOR_REVIEW = 3;

/**
 * ストアレビュー依頼の可否（純関数）。
 * 累計セッションが閾値以上で、まだ一度も依頼していなければ true。
 * （Apple/Google とも年内の表示回数に制限があるため、まず初回のみ依頼する。）
 */
export function shouldRequestReview(totalSessions: number, lastReviewRequestAt: string | null): boolean {
  return totalSessions >= MIN_SESSIONS_FOR_REVIEW && lastReviewRequestAt === null;
}
```

- [ ] **Step 5:** `npx jest __tests__/review.test.ts` → PASS.

- [ ] **Step 6: ストアに lastReviewRequestAt + recordReviewRequest + migrate v2** — `src/store/useUserStore.ts`:
  - `UserStore` interface に追加: `lastReviewRequestAt: string | null;` と `recordReviewRequest: () => void;`
  - 初期 state に追加: `lastReviewRequestAt: null,`
  - アクション追加:
```typescript
      recordReviewRequest: () => set({ lastReviewRequestAt: new Date().toISOString() }),
```
  - persist の `version` を `2` に変更し、migrate に v2 分岐を追加:
```typescript
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        let state = persisted;
        if (fromVersion < 1) {
          state = { ...state, currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null };
        }
        if (fromVersion < 2) {
          state = { ...state, lastReviewRequestAt: null };
        }
        return state;
      },
```

- [ ] **Step 7: ストアテスト** — `__tests__/useUserStore.test.ts`:
  - `describe('useUserStore')` の `beforeEach` の `setState` に `lastReviewRequestAt: null,` を追加。
  - 末尾に追記:
```typescript
describe('recordReviewRequest', () => {
  it('stamps lastReviewRequestAt with an ISO time', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.lastReviewRequestAt).toBeNull();
    act(() => result.current.recordReviewRequest());
    expect(typeof result.current.lastReviewRequestAt).toBe('string');
    expect(Number.isNaN(Date.parse(result.current.lastReviewRequestAt!))).toBe(false);
  });
});
```

- [ ] **Step 8: expo-store-review 手動モック** — Create `__mocks__/expo-store-review.js`:
```javascript
module.exports = {
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
};
```

- [ ] **Step 9: CompletionScreen テスト（失敗するはず）** — Modify `__tests__/screens/CompletionStreak.test.tsx`:
  - 先頭に `import * as StoreReview from 'expo-store-review';` を追加。
  - `jest.mock('expo-store-review');`（自動で `__mocks__/expo-store-review.js` が使われる）を追加。
  - 既存の `useUserStore` モックに `lastReviewRequestAt: null,` と `recordReviewRequest: jest.fn(),` を追加（`totalSessions: 12` は既に閾値超え）。
  - 末尾に追記:
```typescript
test('完了時に条件を満たせばレビュー依頼を出す', async () => {
  render(<CompletionScreen />);
  await waitFor(() => expect(StoreReview.requestReview).toHaveBeenCalled());
});
```

- [ ] **Step 10:** `npx jest __tests__/screens/CompletionStreak.test.tsx` → 新テストが FAIL。

- [ ] **Step 11: CompletionScreen 実装** — `src/screens/CompletionScreen.tsx`:
  - import 追加: `import * as StoreReview from 'expo-store-review';` と `import { shouldRequestReview } from '../utils/review';`
  - `useUserStore()` 分割代入に `lastReviewRequestAt, recordReviewRequest` を追加。
  - `useEffect` を次に置換（通知スケジュール後にレビュー判定）:
```typescript
  useEffect(() => {
    scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig).catch(() => {});
    if (shouldRequestReview(totalSessions, lastReviewRequestAt)) {
      (async () => {
        if (await StoreReview.isAvailableAsync()) {
          await StoreReview.requestReview();
          recordReviewRequest();
        }
      })().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 12:** `npx jest __tests__/screens/CompletionStreak.test.tsx` → PASS。

- [ ] **Step 13: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/utils/review.ts __tests__/review.test.ts __mocks__/expo-store-review.js src/store/useUserStore.ts src/screens/CompletionScreen.tsx __tests__/useUserStore.test.ts __tests__/screens/CompletionStreak.test.tsx package.json package-lock.json
git commit -m "feat: request store review after a few completed sessions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 主要操作要素のアクセシビリティ属性

過剰投資を避け、主要タップ要素に限定して `accessibilityRole`/`accessibilityLabel` を付与する。

**Files:** Modify `src/components/PrimaryButton.tsx`, `src/screens/GateScreen.tsx`, `src/screens/SessionScreen.tsx`, `src/screens/SettingsScreen.tsx`; Test `__tests__/components/PrimaryButton.test.tsx`（追記）。

- [ ] **Step 1: PrimaryButton の a11y テスト（失敗するはず）** — `__tests__/components/PrimaryButton.test.tsx` に追記（既存の import/構造を確認して合わせる）:
```typescript
import { render } from '@testing-library/react-native';
import React from 'react';
import PrimaryButton from '../../src/components/PrimaryButton';

it('exposes an accessible button with its label', () => {
  const { getByLabelText } = render(<PrimaryButton label="今すぐストレッチする" onPress={() => {}} />);
  const node = getByLabelText('今すぐストレッチする');
  expect(node).toBeTruthy();
  expect(node.props.accessibilityRole).toBe('button');
});
```

- [ ] **Step 2:** `npx jest __tests__/components/PrimaryButton.test.tsx` → 新テストが FAIL。

- [ ] **Step 3: PrimaryButton に a11y 付与** — `src/components/PrimaryButton.tsx` の `TouchableOpacity` に追加:
```tsx
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
```

- [ ] **Step 4:** `npx jest __tests__/components/PrimaryButton.test.tsx` → PASS。

- [ ] **Step 5: 主要タッチ要素に付与（テキストラベル付き Touchable）** — 以下の各 `TouchableOpacity` に `accessibilityRole="button"` と `accessibilityLabel` を付与（表示テキストと同じ文言で可）:
  - `src/screens/GateScreen.tsx`: スキップの `TouchableOpacity`（`accessibilityLabel="スキップ"`）。
  - `src/screens/SessionScreen.tsx`: 「終了」(`accessibilityLabel="セッションを終了"`)、一時停止/再開ボタン(`accessibilityLabel={paused ? 'ストレッチを再開' : 'ストレッチを一時停止'}`)、「スキップ →」(`accessibilityLabel="次のストレッチへスキップ"`)。
  - `src/screens/SettingsScreen.tsx`: 「ストレッチ通知」の `Switch` に `accessibilityLabel="ストレッチ通知"`。プロフィール編集の2つの `TouchableOpacity`（シーン/部位）に `accessibilityRole="button"` と `accessibilityLabel`（例: `"シーンを変更"`, `"気になる部位を変更"`）。

- [ ] **Step 6: 全テスト + コミット** — `npx jest`（緑）後:
```bash
git add src/components/PrimaryButton.tsx src/screens/GateScreen.tsx src/screens/SessionScreen.tsx src/screens/SettingsScreen.tsx __tests__/components/PrimaryButton.test.tsx
git commit -m "feat: add accessibility labels to primary interactive elements

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage（WS6 鍵不要分）:**
- expo-store-review レビュー依頼（完了時・累計閾値・1度のみ） → Task 1 ✓
- a11y ラベル（主要操作要素） → Task 2 ✓
- persist migrate v2（lastReviewRequestAt） → Task 1 Step6 ✓
- Sentry / EAS Update → 本Phase対象外（認証情報待ち）。spec の該当は別途。

**Placeholder scan:** なし。

**Type consistency:** `shouldRequestReview(totalSessions: number, lastReviewRequestAt: string|null)` を review.ts で定義し CompletionScreen で使用。`lastReviewRequestAt`/`recordReviewRequest` を store interface・初期state・migrate・テスト・CompletionScreen で一致。`__mocks__/expo-store-review.js` は `isAvailableAsync`/`requestReview` を提供（CompletionScreen が使う2メソッド）。

**留意:**
- migrate を version 2 に上げる。既存 v1 ユーザー（Phase2導入済）には `lastReviewRequestAt:null` を補完。v0 ユーザーは v1分岐→v2分岐の両方を通る（累積マイグレーション）。
- レビュー依頼は実機でしか実挙動を確認できない（OSのレート制限あり）。テストはモックで「呼ばれること」のみ検証。
- a11y は主要タップ要素に限定（CountdownTimer 等の細部は対象外、過剰投資回避）。
