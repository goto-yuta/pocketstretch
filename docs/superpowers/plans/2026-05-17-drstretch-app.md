# DrStretch Self-Care App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Native (Expo) セルフケアアプリ — ユーザーの悩み部位・シーンに合ったストレッチを提示し、プッシュ通知 + フォアグラウンド占有モードで実施させる。

**Architecture:** Expo managed workflow。ストレッチコンテンツはTypeScript定数としてバンドル。Zustand + AsyncStorageでユーザープロフィールを永続化。expo-notificationsでローカル通知をスケジューリング。SessionScreenは全画面Modal + expo-keep-awakeでフォアグラウンド占有。

**Tech Stack:** React Native, Expo SDK 52+, React Navigation 6, Zustand 4, expo-notifications, expo-keep-awake, @react-native-async-storage/async-storage, Jest

---

## File Structure

```
/
├── App.tsx                                  # エントリ、通知ハンドラ設定
├── app.json                                 # expo-notifications plugin
├── src/
│   ├── types/index.ts                       # BodyPart, Scene, Stretch, UserProfile, NavParams
│   ├── data/stretches.ts                    # 全ストレッチコンテンツ (15種)
│   ├── store/useUserStore.ts                # Zustand store (永続化)
│   ├── utils/filterStretches.ts             # フィルタ・おすすめ算出
│   ├── notifications/index.ts               # 通知許可・スケジューリング
│   ├── navigation/index.tsx                 # ルートナビゲーター
│   ├── components/CountdownTimer.tsx        # カウントダウン円形タイマー
│   └── screens/
│       ├── onboarding/
│       │   ├── Step1BodyParts.tsx           # 部位選択
│       │   ├── Step2Scene.tsx               # シーン選択
│       │   └── Step3Notifications.tsx       # 通知時間設定
│       ├── HomeScreen.tsx                   # おすすめ + 絞り込み
│       ├── SessionScreen.tsx                # 全画面ストレッチ実施
│       ├── CompletionScreen.tsx             # 完了画面
│       └── SettingsScreen.tsx               # 通知・プロフィール変更
└── __tests__/
    ├── filterStretches.test.ts
    ├── useUserStore.test.ts
    └── notifications.test.ts
```

---

### Task 1: Initialize Expo project

**Files:**
- Create: `package.json`, `App.tsx`, `tsconfig.json`, `babel.config.js`, `app.json`

- [ ] **Step 1: Initialize**

```bash
cd /Users/goto/.superset/worktrees/drstretch/goto-yuta/firstver
npx create-expo-app@latest . --template blank-typescript
```

既存ファイル上書きを確認されたら `y` を選択。

- [ ] **Step 2: 起動確認**

```bash
npx expo start --no-dev
```

Expected: Metro bundler起動、QRコード表示。Ctrl+Cで停止。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize Expo blank-typescript project"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`, `app.json`

- [ ] **Step 1: Expoランタイム依存をインストール**

```bash
npx expo install \
  react-native-screens \
  react-native-safe-area-context \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  zustand \
  @react-native-async-storage/async-storage \
  expo-notifications \
  expo-keep-awake \
  expo-device
```

- [ ] **Step 2: テスト依存をインストール**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: package.json の jest セクションを更新**

`package.json` の `"jest"` キーを以下に置き換える:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 4: app.json にexpo-notificationsプラグインを追加**

`app.json` の `"expo"` オブジェクト内に追加:

```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#ffffff",
      "sounds": []
    }
  ]
]
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install runtime and test dependencies"
```

---

### Task 3: Types and stretch content

**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/stretches.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
export type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg';
export type Scene = 'office' | 'home' | 'serious';

export interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: number; // require() result
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];
}

export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  notificationEnabled: boolean;
  notificationTimes: string[]; // ["09:00", "14:00"]
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Session: { stretchIds: string[] };
  Completion: undefined;
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
```

- [ ] **Step 2: Create `src/data/stretches.ts`**

`assets/icon.png` はExpoテンプレートに含まれる — これをプレースホルダー画像として使う。

```typescript
import { Stretch } from '../types';
const placeholder = require('../../assets/icon.png');

export const ALL_STRETCHES: Stretch[] = [
  // ── オフィス向け (difficulty: 1) ──────────────────────
  {
    id: 'neck-side',
    nameJa: '首の横伸ばし',
    descriptionJa: '座ったまま首を横に倒し、反対の肩が上がらないよう意識しながら15秒キープ。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['neck'],
    scenes: ['office', 'home', 'serious'],
    steps: ['背筋を伸ばして座る', '右手を頭の左側に添える', '頭をゆっくり右に倒す', '左肩が上がらないよう意識する', '15秒キープ後、反対側も'],
  },
  {
    id: 'shoulder-roll',
    nameJa: '肩甲骨ほぐし',
    descriptionJa: '肩を大きく後ろに回し、肩甲骨を寄せる動きを繰り返す。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['肩の力を抜く', 'ゆっくり肩を後ろに大きく回す', '肩甲骨を背中の中央に引き寄せる意識で', '10回繰り返す'],
  },
  {
    id: 'chest-open',
    nameJa: '胸開き',
    descriptionJa: '両手を背中で組み、胸を前に開いて肩甲骨を寄せる。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['椅子の背もたれから少し離れて座る', '両手を背中で組む', 'ゆっくり胸を前に突き出す', '肩甲骨を寄せて20秒キープ'],
  },
  {
    id: 'seated-twist',
    nameJa: '座ったまま腰ひねり',
    descriptionJa: '椅子に座ったまま上体をひねり、腰から背中をほぐす。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['back'],
    scenes: ['office', 'home'],
    steps: ['背筋を伸ばして座る', '右手を左ひざの外側に置く', 'ゆっくり左にひねる', '15秒キープ後、反対側も'],
  },
  {
    id: 'seated-hip',
    nameJa: '座って股関節ほぐし',
    descriptionJa: '椅子に座り、右足首を左ひざに乗せて股関節を外に開く。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['hip'],
    scenes: ['office', 'home'],
    steps: ['椅子に深く腰掛ける', '右足首を左ひざの上に乗せる', '背筋を伸ばしたまま上体を少し前傾', '股関節の伸びを感じながら20秒キープ', '反対側も同様に'],
  },
  // ── 自宅ライト (difficulty: 2) ───────────────────────
  {
    id: 'shoulder-cross',
    nameJa: '肩の横引き',
    descriptionJa: '片腕を胸の前でまっすぐ横に引き、肩後部を伸ばす。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['shoulder'],
    scenes: ['home', 'serious'],
    steps: ['右腕をまっすぐ左方向に伸ばす', '左腕で右腕の肘付近を手前に引く', '右肩の後ろ側の伸びを感じる', '20秒キープ後、反対側も'],
  },
  {
    id: 'forward-fold',
    nameJa: '前屈',
    descriptionJa: '立って上体を前に倒し、腰と太ももの裏を伸ばす。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['back', 'leg'],
    scenes: ['home', 'serious'],
    steps: ['足を肩幅に開いて立つ', 'ゆっくり上体を前に倒す', '手は自然に床方向へ', '膝を軽く曲げてもOK', '20秒キープ'],
  },
  {
    id: 'butterfly',
    nameJa: '蝶番ストレッチ（股関節）',
    descriptionJa: '床に座り、両足裏を合わせて股関節を開く。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['hip'],
    scenes: ['home', 'serious'],
    steps: ['床に座り両足裏を合わせる', '踵を体に引き寄せる', '背筋を伸ばし、ひざを床方向に押し下げる', '上体を少し前傾させてもOK', '30秒キープ'],
  },
  {
    id: 'hamstring',
    nameJa: 'ハムストリングス伸ばし',
    descriptionJa: '床に座り片足を伸ばして前屈し、太もも裏を伸ばす。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['床に座り右足を前に伸ばす', '左足は膝を曲げてくの字に', '背筋を伸ばしたまま上体を右足方向に倒す', '太もも裏の伸びを感じながら20秒', '反対側も同様に'],
  },
  {
    id: 'calf',
    nameJa: 'ふくらはぎ伸ばし',
    descriptionJa: '壁に手をついてアキレス腱とふくらはぎを伸ばす。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['壁に両手をつく', '右足を後ろに引く', '踵を床につけたまま後ろ足の膝を伸ばす', 'ふくらはぎの伸びを感じながら20秒', '反対側も同様に'],
  },
  // ── 本格 (difficulty: 3) ─────────────────────────────
  {
    id: 'lunge',
    nameJa: 'ランジ（股関節＆脚）',
    descriptionJa: '大きく前踏み出しのランジポーズで股関節屈筋と脚を同時に伸ばす。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 3,
    bodyParts: ['hip', 'leg'],
    scenes: ['serious'],
    steps: ['立った状態から右足を大きく前に踏み出す', '前ひざは90度、後ろひざは床に近づける', '上体を起こしたまま股関節を前方向に押し出す', '30秒キープ後、反対側も'],
  },
  {
    id: 'pigeon',
    nameJa: 'ハーフピジョン（股関節）',
    descriptionJa: '床に右ひざを曲げて置き、股関節の深部を伸ばす本格ポーズ。',
    image: placeholder,
    durationSeconds: 45,
    difficulty: 3,
    bodyParts: ['hip'],
    scenes: ['serious'],
    steps: ['四つん這いから右ひざを右手首の方向に持ってくる', '右すねを床に置き、左足を後ろに伸ばす', '両手を前について上体を低くする', '股関節の深い伸びを感じながら30秒', '反対側も同様に'],
  },
  {
    id: 'spinal-twist',
    nameJa: '寝たまま脊椎ひねり',
    descriptionJa: '仰向けに寝て片膝を反対側に倒し、背骨を深くひねる。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 3,
    bodyParts: ['back'],
    scenes: ['serious'],
    steps: ['仰向けに寝る', '右ひざを立てて左側に倒す', '両腕は横に広げる', '視線は右方向', '30秒キープ後、反対側も'],
  },
  {
    id: 'neck-full',
    nameJa: '首の総合ストレッチ',
    descriptionJa: '前後左右・回旋を含む首の総合ケア。血行促進と緊張緩和に。',
    image: placeholder,
    durationSeconds: 45,
    difficulty: 3,
    bodyParts: ['neck'],
    scenes: ['home', 'serious'],
    steps: ['ゆっくり頭を前に倒して10秒', '後ろに倒して10秒', '右に倒して10秒', '左に倒して10秒', '最後にゆっくり右回転→左回転'],
  },
  {
    id: 'shoulder-full',
    nameJa: '肩の総合ストレッチ',
    descriptionJa: '肩甲骨まわりを多角度からほぐす本格メニュー。四十肩予防にも。',
    image: placeholder,
    durationSeconds: 45,
    difficulty: 3,
    bodyParts: ['shoulder'],
    scenes: ['home', 'serious'],
    steps: ['壁に右手を置き体を反対方向に向けて胸を開く（15秒）', '右腕を頭の上に上げひじを曲げて左手で引く（15秒）', '右腕を背中に回して肩甲骨下角を伸ばす（15秒）', '反対側も同様に'],
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add types and stretch content (15 stretches)"
```

---

### Task 4: User store (Zustand + AsyncStorage)

**Files:**
- Create: `src/store/useUserStore.ts`
- Create: `__tests__/useUserStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/useUserStore.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';
import { useUserStore } from '../src/store/useUserStore';

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      notificationEnabled: false,
      notificationTimes: [],
    });
  });

  it('sets body parts', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setBodyParts(['neck', 'shoulder']));
    expect(result.current.bodyParts).toEqual(['neck', 'shoulder']);
  });

  it('sets scene', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setScene('serious'));
    expect(result.current.scene).toBe('serious');
  });

  it('completes onboarding', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.completeOnboarding());
    expect(result.current.onboardingCompleted).toBe(true);
  });

  it('sets notification times', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setNotificationTimes(['09:00', '14:00']));
    expect(result.current.notificationTimes).toEqual(['09:00', '14:00']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/useUserStore.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/store/useUserStore'`

- [ ] **Step 3: Create `src/store/useUserStore.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, UserProfile } from '../types';

interface UserStore extends UserProfile {
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  completeOnboarding: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      notificationEnabled: false,
      notificationTimes: [],
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/useUserStore.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/store/ __tests__/useUserStore.test.ts
git commit -m "feat: add user store with AsyncStorage persistence"
```

---

### Task 5: Stretch filtering utilities

**Files:**
- Create: `src/utils/filterStretches.ts`
- Create: `__tests__/filterStretches.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/filterStretches.test.ts`:

```typescript
import { ALL_STRETCHES } from '../src/data/stretches';
import { filterStretches, getRecommended } from '../src/utils/filterStretches';
import { Stretch } from '../src/types';

const mockStretches: Stretch[] = [
  {
    id: 'a', nameJa: 'A', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 1,
    bodyParts: ['neck'], scenes: ['office'], steps: [],
  },
  {
    id: 'b', nameJa: 'B', descriptionJa: '', image: 0,
    durationSeconds: 30, difficulty: 2,
    bodyParts: ['shoulder', 'back'], scenes: ['home'], steps: [],
  },
];

describe('filterStretches', () => {
  it('filters by scene', () => {
    const result = filterStretches(mockStretches, { scene: 'office' });
    expect(result.map((s) => s.id)).toEqual(['a']);
  });

  it('filters by bodyPart', () => {
    const result = filterStretches(mockStretches, { bodyParts: ['shoulder'] });
    expect(result.map((s) => s.id)).toEqual(['b']);
  });

  it('returns all when no filter', () => {
    expect(filterStretches(mockStretches, {})).toHaveLength(2);
  });

  it('scene AND bodyPart both must match', () => {
    const result = filterStretches(mockStretches, { scene: 'office', bodyParts: ['back'] });
    expect(result).toHaveLength(0);
  });
});

describe('getRecommended', () => {
  it('returns up to 5 stretches', () => {
    const result = getRecommended(ALL_STRETCHES, ['neck', 'shoulder'], 'office');
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThan(0);
  });

  it('prefers stretches matching both scene and bodyPart', () => {
    const result = getRecommended(ALL_STRETCHES, ['neck'], 'office');
    // neck-side matches both neck AND office → should appear first
    expect(result[0].id).toBe('neck-side');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Create `src/utils/filterStretches.ts`**

```typescript
import { BodyPart, Scene, Stretch } from '../types';

interface FilterOptions {
  scene?: Scene;
  bodyParts?: BodyPart[];
}

export function filterStretches(stretches: Stretch[], options: FilterOptions): Stretch[] {
  return stretches.filter((s) => {
    if (options.scene && !s.scenes.includes(options.scene)) return false;
    if (options.bodyParts?.length && !options.bodyParts.some((bp) => s.bodyParts.includes(bp))) return false;
    return true;
  });
}

export function getRecommended(stretches: Stretch[], bodyParts: BodyPart[], scene: Scene): Stretch[] {
  const scored = stretches
    .filter((s) => s.scenes.includes(scene) || s.bodyParts.some((bp) => bodyParts.includes(bp)))
    .map((s) => ({
      stretch: s,
      score:
        (s.scenes.includes(scene) ? 1 : 0) +
        s.bodyParts.filter((bp) => bodyParts.includes(bp)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.stretch);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/ __tests__/filterStretches.test.ts
git commit -m "feat: add stretch filtering utilities"
```

---

### Task 6: Notification helpers

**Files:**
- Create: `src/notifications/index.ts`
- Create: `__tests__/notifications.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/notifications.test.ts`:

```typescript
import { parseTimeString, buildDailyTriggers } from '../src/notifications';

describe('parseTimeString', () => {
  it('parses HH:MM into hours and minutes', () => {
    expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeString('14:00')).toEqual({ hour: 14, minute: 0 });
  });
});

describe('buildDailyTriggers', () => {
  it('returns one trigger per time string with repeats:true', () => {
    const triggers = buildDailyTriggers(['08:00', '12:30', '18:00']);
    expect(triggers).toHaveLength(3);
    expect(triggers[0]).toEqual({ hour: 8, minute: 0, repeats: true });
    expect(triggers[2]).toEqual({ hour: 18, minute: 0, repeats: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/notifications.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Create `src/notifications/index.ts`**

```typescript
import * as Notifications from 'expo-notifications';

export function parseTimeString(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

export function buildDailyTriggers(
  times: string[]
): Array<{ hour: number; minute: number; repeats: true }> {
  return times.map((t) => ({ ...parseTimeString(t), repeats: true as const }));
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotifications(times: string[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const time of times) {
    const { hour, minute } = parseTimeString(time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ストレッチの時間です！',
        body: 'ちょっとほぐしてリフレッシュしましょう',
        data: { screen: 'Session' },
      },
      trigger: { hour, minute, repeats: true },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/notifications.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/notifications/ __tests__/notifications.test.ts
git commit -m "feat: add notification scheduling helpers"
```

---

### Task 7: Navigation structure

**Files:**
- Create: `src/navigation/index.tsx`

- [ ] **Step 1: Create `src/navigation/index.tsx`**

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useUserStore } from '../store/useUserStore';
import { MainTabParamList, OnboardingStackParamList, RootStackParamList } from '../types';
import Step1BodyParts from '../screens/onboarding/Step1BodyParts';
import Step2Scene from '../screens/onboarding/Step2Scene';
import Step3Notifications from '../screens/onboarding/Step3Notifications';
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
      <OnboardingStack.Screen name="Step3" component={Step3Notifications} />
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
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
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

- [ ] **Step 2: Commit**

```bash
git add src/navigation/
git commit -m "feat: add root navigation structure"
```

---

### Task 8: Onboarding screens

**Files:**
- Create: `src/screens/onboarding/Step1BodyParts.tsx`
- Create: `src/screens/onboarding/Step2Scene.tsx`
- Create: `src/screens/onboarding/Step3Notifications.tsx`

- [ ] **Step 1: Create `src/screens/onboarding/Step1BodyParts.tsx`**

```tsx
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { BodyPart, OnboardingStackParamList } from '../../types';

const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'neck', label: '首' },
  { id: 'shoulder', label: '肩' },
  { id: 'back', label: '腰・背中' },
  { id: 'hip', label: '股関節' },
  { id: 'leg', label: '脚' },
];

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step1'>;
};

export default function Step1BodyParts({ navigation }: Props) {
  const setBodyParts = useUserStore((s) => s.setBodyParts);
  const [selected, setSelected] = useState<BodyPart[]>([]);

  function toggle(part: BodyPart) {
    setSelected((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  function handleNext() {
    if (selected.length === 0) return;
    setBodyParts(selected);
    navigation.navigate('Step2');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>気になる部位を選んでください</Text>
      <Text style={styles.subtitle}>複数選択できます</Text>
      <View style={styles.grid}>
        {BODY_PARTS.map(({ id, label }) => (
          <Pressable
            key={id}
            style={[styles.chip, selected.includes(id) && styles.chipSelected]}
            onPress={() => toggle(id)}
          >
            <Text style={[styles.chipText, selected.includes(id) && styles.chipTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={selected.length === 0}
      >
        <Text style={styles.buttonText}>次へ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40 },
  chip: { borderWidth: 2, borderColor: '#ddd', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20 },
  chipSelected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 16, color: '#555' },
  chipTextSelected: { color: '#2E7D32', fontWeight: 'bold' },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
```

- [ ] **Step 2: Create `src/screens/onboarding/Step2Scene.tsx`**

```tsx
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList, Scene } from '../../types';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home', label: '自宅ライト', emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious', label: '本格ケア', emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step2'>;
};

export default function Step2Scene({ navigation }: Props) {
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.navigate('Step3');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>シーンを選んでください</Text>
      <View style={styles.list}>
        {SCENES.map(({ id, label, emoji, desc }) => (
          <Pressable key={id} style={styles.card} onPress={() => handleSelect(id)}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.desc}>{desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  list: { gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#eee', backgroundColor: '#fafafa' },
  emoji: { fontSize: 32 },
  label: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  desc: { fontSize: 13, color: '#888', marginTop: 4 },
});
```

- [ ] **Step 3: Create `src/screens/onboarding/Step3Notifications.tsx`**

```tsx
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPermissions, scheduleNotifications } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';

const DEFAULT_TIMES = ['09:00', '13:00', '18:00'];

export default function Step3Notifications() {
  const { completeOnboarding, setNotificationEnabled, setNotificationTimes } = useUserStore();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
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
    await scheduleNotifications(DEFAULT_TIMES);
    setNotificationEnabled(true);
    setNotificationTimes(DEFAULT_TIMES);
    completeOnboarding();
    setLoading(false);
    // completeOnboarding() がストアを更新 → RootNavigatorがMainに切り替わる
  }

  function handleSkip() {
    setNotificationEnabled(false);
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>毎日この時間にお知らせします</Text>
      <View style={styles.timesBox}>
        {DEFAULT_TIMES.map((t) => (
          <Text key={t} style={styles.time}>{t}</Text>
        ))}
      </View>
      <Text style={styles.note}>通知時間は後から設定で変更できます</Text>
      <TouchableOpacity style={styles.button} onPress={handleEnable} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '設定中...' : '通知を有効にする'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24 },
  timesBox: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 12 },
  time: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  note: { textAlign: 'center', color: '#aaa', fontSize: 12, marginBottom: 40 },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skip: { alignItems: 'center' },
  skipText: { color: '#aaa', fontSize: 15 },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/onboarding/
git commit -m "feat: add onboarding screens (Step1-3)"
```

---

### Task 9: CountdownTimer component

**Files:**
- Create: `src/components/CountdownTimer.tsx`

- [ ] **Step 1: Create `src/components/CountdownTimer.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  durationSeconds: number;
  onComplete: () => void;
  running: boolean;
}

export default function CountdownTimer({ durationSeconds, onComplete, running }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, durationSeconds]);

  return (
    <View style={styles.circle}>
      <Text style={styles.number}>{remaining}</Text>
      <Text style={styles.label}>秒</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#4CAF50',
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 20,
  },
  number: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32' },
  label: { fontSize: 12, color: '#555' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/
git commit -m "feat: add CountdownTimer component"
```

---

### Task 10: Home screen

**Files:**
- Create: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Create `src/screens/HomeScreen.tsx`**

```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { BodyPart, RootStackParamList, Scene, Stretch } from '../types';
import { filterStretches, getRecommended } from '../utils/filterStretches';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCENE_LABELS: Record<Scene, string> = {
  office: '💼 オフィス',
  home: '🏠 自宅',
  serious: '💪 本格',
};

const BODY_LABELS: Record<BodyPart, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

function StretchCard({ stretch, onPress }: { stretch: Stretch; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={stretch.image} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{stretch.nameJa}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{stretch.descriptionJa}</Text>
        <Text style={styles.cardDuration}>{stretch.durationSeconds}秒</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene } = useUserStore();
  const recommended = getRecommended(ALL_STRETCHES, bodyParts, scene);

  function startSession(stretches: Stretch[]) {
    if (stretches.length === 0) return;
    navigation.navigate('Session', { stretchIds: stretches.map((s) => s.id) });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>今日のおすすめ</Text>
        {recommended.map((s) => (
          <StretchCard key={s.id} stretch={s} onPress={() => startSession([s])} />
        ))}
        {recommended.length > 1 && (
          <Pressable style={styles.startAll} onPress={() => startSession(recommended)}>
            <Text style={styles.startAllText}>おすすめ全部やる</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>シーンで探す</Text>
        <View style={styles.row}>
          {(['office', 'home', 'serious'] as Scene[]).map((sc) => (
            <Pressable
              key={sc}
              style={styles.sceneChip}
              onPress={() => startSession(filterStretches(ALL_STRETCHES, { scene: sc }))}
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
              onPress={() => startSession(filterStretches(ALL_STRETCHES, { bodyParts: [bp] }))}
            >
              <Text style={styles.bodyChipText}>{BODY_LABELS[bp]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', margin: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  card: { flexDirection: 'row', margin: 8, marginHorizontal: 16, borderRadius: 12, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  cardImage: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 10, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDuration: { fontSize: 12, color: '#4CAF50', marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  sceneChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  sceneChipText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  bodyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8' },
  bodyChipText: { fontSize: 14, color: '#6A1B9A', fontWeight: '600' },
  startAll: { margin: 16, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startAllText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add Home screen"
```

---

### Task 11: Session screen (foreground occupation)

**Files:**
- Create: `src/screens/SessionScreen.tsx`

- [ ] **Step 1: Create `src/screens/SessionScreen.tsx`**

```tsx
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
  const stretches = ALL_STRETCHES.filter((s) => route.params.stretchIds.includes(s.id));
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);

  const current = stretches[index];

  function advance() {
    if (index + 1 >= stretches.length) {
      navigation.replace('Completion');
    } else {
      setRunning(false);
      setIndex((i) => i + 1);
      // 少し間を置いてからタイマーを再開し、画面遷移感を出す
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

- [ ] **Step 2: Commit**

```bash
git add src/screens/SessionScreen.tsx
git commit -m "feat: add Session screen with keep-awake and countdown"
```

---

### Task 12: Completion and Settings screens

**Files:**
- Create: `src/screens/CompletionScreen.tsx`
- Create: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Create `src/screens/CompletionScreen.tsx`**

```tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
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

- [ ] **Step 2: Create `src/screens/SettingsScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAllNotifications, requestPermissions, scheduleNotifications } from '../notifications';
import { useUserStore } from '../store/useUserStore';

const SCENE_LABEL: Record<string, string> = {
  office: 'オフィス向け', home: '自宅ライト', serious: '本格ケア',
};
const BODY_LABEL: Record<string, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

export default function SettingsScreen() {
  const {
    notificationEnabled, notificationTimes,
    setNotificationEnabled, setNotificationTimes,
    bodyParts, scene,
  } = useUserStore();
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>設定</Text>

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  label: { fontSize: 16, color: '#333' },
  sub: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#888', marginTop: 24, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  infoLabel: { fontSize: 15, color: '#555' },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '600' },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/CompletionScreen.tsx src/screens/SettingsScreen.tsx
git commit -m "feat: add Completion and Settings screens"
```

---

### Task 13: Wire App.tsx

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Replace `App.tsx`**

```tsx
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import RootNavigator from './src/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // 通知タップ時: アプリがフォアグラウンドに来るだけでOK
    // (Session起動はHome画面のユーザー操作で行う — 通知はリマインダーとして機能)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // アプリが起動されれば自動でHomeに遷移する (navigatorが制御)
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return <RootNavigator />;
}
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS (12 tests)

- [ ] **Step 3: Verify on simulator**

```bash
npx expo start
```

iOSシミュレーターまたはAndroidエミュレーターで確認:
- [ ] 初回起動 → Step1（部位選択）が表示される
- [ ] チップをタップ → 選択状態になる、次へボタンが有効化される
- [ ] Step2でシーン選択 → Step3へ進む
- [ ] Step3でスキップ → ホーム画面に遷移する
- [ ] ホームに「今日のおすすめ」が表示される
- [ ] ストレッチカードをタップ → Session画面が全画面で開く
- [ ] カウントダウンが動く、自動で次のポーズへ進む
- [ ] スキップボタンで次へスキップできる
- [ ] 終了ボタン → 確認ダイアログが出る
- [ ] 全ポーズ完了 → 「お疲れ様でした！」画面
- [ ] 「ホームに戻る」 → Home画面に戻る
- [ ] 設定タブ → 通知スイッチが表示される

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat: wire App.tsx with notification handler"
```
