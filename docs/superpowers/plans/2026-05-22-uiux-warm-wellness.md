# Warm Wellness UIUX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全画面をテラコッタ×クリームの「Warm Wellness」パレットに刷新し、デザイントークンで一元管理する。

**Architecture:** `src/styles/tokens.ts` にカラー/Radius/Shadow定数を集約し、全画面の `StyleSheet` をトークン参照に差し替える。グラデーションCTAは `PrimaryButton` コンポーネントに集約。オンボーディングにステップバーを追加し、設定画面からプロフィール編集できるモーダル画面を追加する。

**Tech Stack:** React Native 0.81, Expo SDK 54, expo-linear-gradient, TypeScript, Zustand, @react-navigation/native-stack

---

## File Map

| ファイル | 種別 | 変更内容 |
|---------|------|---------|
| `src/styles/tokens.ts` | 新規 | カラー/Radius/Shadow定数 |
| `src/components/PrimaryButton.tsx` | 新規 | グラデーションCTAボタン |
| `src/components/OnboardingProgressBar.tsx` | 新規 | ステップバー |
| `src/types/index.ts` | 変更 | RootStackParamList に EditScene/EditBodyParts 追加 |
| `src/navigation/index.tsx` | 変更 | EditScene/EditBodyParts ルート追加 |
| `src/screens/EditScene.tsx` | 新規 | シーン編集モーダル |
| `src/screens/EditBodyParts.tsx` | 新規 | 部位編集モーダル |
| `src/screens/HomeScreen.tsx` | 変更 | トークン適用 + 挨拶 + 進捗カード |
| `src/components/CountdownTimer.tsx` | 変更 | グリーン→テラコッタ |
| `src/screens/SessionScreen.tsx` | 変更 | トークン適用 + 操作行並び替え |
| `src/screens/CompletionScreen.tsx` | 変更 | トークン適用 + 統計カード追加 |
| `src/screens/GateScreen.tsx` | 変更 | トークン適用 + 絵文字 + 一覧カード |
| `src/screens/SettingsScreen.tsx` | 変更 | トークン適用 + プロフィール行編集可能化 |
| `src/screens/onboarding/Step1BodyParts.tsx` | 変更 | トークン + ProgressBar |
| `src/screens/onboarding/Step2Scene.tsx` | 変更 | トークン + ProgressBar |
| `src/screens/onboarding/Step3Sport.tsx` | 変更 | トークン + ProgressBar |
| `src/screens/onboarding/Step4Notifications.tsx` | 変更 | トークン + 時間調整UI |

---

## Task 1: expo-linear-gradient インストール + デザイントークン作成

**Files:**
- Modify: `package.json`
- Create: `src/styles/tokens.ts`

- [ ] **Step 1: expo-linear-gradient をインストール**

```bash
npx expo install expo-linear-gradient
```

Expected: `package.json` に `"expo-linear-gradient"` が追加される。

- [ ] **Step 2: `src/styles/tokens.ts` を作成**

```ts
import { Platform } from 'react-native';

export const Colors = {
  primary:       '#E8874A',
  primaryDeep:   '#D4614A',
  primaryLight:  '#FFE5CC',
  bgMain:        '#FFF8F2',
  bgCard:        '#FFFFFF',
  bgAccent:      '#FDF0E6',
  textPrimary:   '#3D1F0A',
  textSecondary: '#8B6555',
  textMuted:     '#C8A898',
  border:        '#F0DDD4',
} as const;

export const Radius = {
  sm:   8,
  md:   14,
  lg:   18,
  full: 999,
} as const;

export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#E8874A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  button: Platform.select({
    ios: {
      shadowColor: '#E8874A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
    default: {},
  })!,
} as const;
```

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json src/styles/tokens.ts
git commit -m "feat: add expo-linear-gradient and design tokens"
```

---

## Task 2: PrimaryButton + OnboardingProgressBar コンポーネント作成

**Files:**
- Create: `src/components/PrimaryButton.tsx`
- Create: `src/components/OnboardingProgressBar.tsx`
- Create: `__tests__/components/PrimaryButton.test.tsx`
- Create: `__tests__/components/OnboardingProgressBar.test.tsx`

- [ ] **Step 1: テストを先に書く**

`__tests__/components/PrimaryButton.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrimaryButton from '../../src/components/PrimaryButton';

test('ラベルを表示する', () => {
  const { getByText } = render(<PrimaryButton label="テスト" onPress={() => {}} />);
  expect(getByText('テスト')).toBeTruthy();
});

test('disabled のとき onPress が呼ばれない', () => {
  const onPress = jest.fn();
  const { getByText } = render(<PrimaryButton label="テスト" onPress={onPress} disabled />);
  fireEvent.press(getByText('テスト'));
  expect(onPress).not.toHaveBeenCalled();
});
```

`__tests__/components/OnboardingProgressBar.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingProgressBar from '../../src/components/OnboardingProgressBar';

test('1/4 のステップ番号を表示する', () => {
  const { getByText } = render(<OnboardingProgressBar current={1} total={4} />);
  expect(getByText('1 / 4')).toBeTruthy();
});

test('4/4 のステップ番号を表示する', () => {
  const { getByText } = render(<OnboardingProgressBar current={4} total={4} />);
  expect(getByText('4 / 4')).toBeTruthy();
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/components/ --no-coverage 2>&1 | tail -10
```

Expected: FAIL (コンポーネントが存在しない)

- [ ] **Step 3: `src/components/PrimaryButton.tsx` を作成**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../styles/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({ label, onPress, disabled = false, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={disabled ? ['#ccc', '#aaa'] : [Colors.primary, Colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, Shadow.button]}
      >
        <Text style={styles.text}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
```

- [ ] **Step 4: `src/components/OnboardingProgressBar.tsx` を作成**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../styles/tokens';

interface Props {
  current: number;
  total: number;
}

export default function OnboardingProgressBar({ current, total }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i < current ? styles.active : styles.inactive]}
          />
        ))}
      </View>
      <Text style={styles.label}>{current} / {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  segments: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  segment: { flex: 1, height: 4, borderRadius: Radius.full },
  active: { backgroundColor: Colors.primary },
  inactive: { backgroundColor: Colors.primaryLight },
  label: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
});
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npx jest __tests__/components/ --no-coverage 2>&1 | tail -10
```

Expected: PASS (2 suites, 4 tests)

- [ ] **Step 6: コミット**

```bash
git add src/components/PrimaryButton.tsx src/components/OnboardingProgressBar.tsx __tests__/components/
git commit -m "feat: add PrimaryButton and OnboardingProgressBar components"
```

---

## Task 3: 型定義 + ナビゲーション + EditScene / EditBodyParts

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/navigation/index.tsx`
- Create: `src/screens/EditScene.tsx`
- Create: `src/screens/EditBodyParts.tsx`
- Create: `__tests__/screens/EditScene.test.tsx`
- Create: `__tests__/screens/EditBodyParts.test.tsx`

- [ ] **Step 1: テストを書く**

`__tests__/screens/EditScene.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EditScene from '../../src/screens/EditScene';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: (sel: any) => sel({ setScene: jest.fn() }),
}));

test('シーン選択後に goBack が呼ばれる', () => {
  const { getByText } = render(<EditScene />);
  fireEvent.press(getByText('オフィス向け'));
  expect(mockGoBack).toHaveBeenCalled();
});
```

`__tests__/screens/EditBodyParts.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EditBodyParts from '../../src/screens/EditBodyParts';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: (sel: any) => sel({
    setBodyParts: jest.fn(),
    bodyParts: [],
  }),
}));

test('部位を選択して保存すると goBack が呼ばれる', () => {
  const { getByText } = render(<EditBodyParts />);
  fireEvent.press(getByText('肩'));
  fireEvent.press(getByText('保存'));
  expect(mockGoBack).toHaveBeenCalled();
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/screens/Edit --no-coverage 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: `src/types/index.ts` に EditScene / EditBodyParts を追加**

`RootStackParamList` を以下に変更（他の型は変更なし）:

```ts
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Gate: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
  EditScene: undefined;
  EditBodyParts: undefined;
};
```

- [ ] **Step 4: `src/screens/EditScene.tsx` を作成**

```tsx
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { Scene } from '../types';
import { Colors, Radius } from '../styles/tokens';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home',   label: '自宅ライト',   emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious',label: '本格ケア',     emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

export default function EditScene() {
  const navigation = useNavigation();
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>シーンを変更</Text>
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
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: Colors.textPrimary },
  list: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  emoji: { fontSize: 32 },
  label: { fontSize: 17, fontWeight: 'bold', color: Colors.textPrimary },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
```

- [ ] **Step 5: `src/screens/EditBodyParts.tsx` を作成**

```tsx
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { BodyPart } from '../types';
import { Colors, Radius } from '../styles/tokens';
import PrimaryButton from '../components/PrimaryButton';

const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'neck',    label: '首' },
  { id: 'shoulder',label: '肩' },
  { id: 'back',    label: '腰・背中' },
  { id: 'hip',     label: '股関節' },
  { id: 'leg',     label: '脚' },
  { id: 'arm',     label: '腕' },
  { id: 'chest',   label: '胸' },
  { id: 'core',    label: '体幹' },
];

export default function EditBodyParts() {
  const navigation = useNavigation();
  const { setBodyParts, bodyParts: current } = useUserStore((s) => ({
    setBodyParts: s.setBodyParts,
    bodyParts: s.bodyParts,
  }));
  const [selected, setSelected] = useState<BodyPart[]>(current);

  function toggle(part: BodyPart) {
    setSelected((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  function handleSave() {
    if (selected.length === 0) return;
    setBodyParts(selected);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>部位を変更</Text>
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
      <PrimaryButton
        label="保存"
        onPress={handleSave}
        disabled={selected.length === 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40 },
  chip: { borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: 20 },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 16, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primaryDeep, fontWeight: 'bold' },
});
```

- [ ] **Step 6: `src/navigation/index.tsx` に EditScene/EditBodyParts を追加**

ファイル先頭のimportに追記:
```tsx
import EditScene from '../screens/EditScene';
import EditBodyParts from '../screens/EditBodyParts';
```

`RootStack.Navigator` の `<>...</>` ブロック内（Completion の後）に追加:
```tsx
<RootStack.Screen
  name="EditScene"
  component={EditScene}
  options={{ presentation: 'modal' }}
/>
<RootStack.Screen
  name="EditBodyParts"
  component={EditBodyParts}
  options={{ presentation: 'modal' }}
/>
```

- [ ] **Step 7: テストが通ることを確認**

```bash
npx jest __tests__/screens/Edit --no-coverage 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add src/types/index.ts src/navigation/index.tsx src/screens/EditScene.tsx src/screens/EditBodyParts.tsx __tests__/screens/
git commit -m "feat: add EditScene and EditBodyParts modal screens"
```

---

## Task 4: HomeScreen リスタイル

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: import を更新**

ファイル先頭の import を以下に差し替え（既存の `StyleSheet` import はそのまま）:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoalSelectorModal from '../components/GoalSelectorModal';
import PrimaryButton from '../components/PrimaryButton';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';
import { getPrescription, getCompletedMinutes, getSessionStretchIds } from '../utils/prescription';
import { Colors, Radius, Shadow } from '../styles/tokens';
```

- [ ] **Step 2: `getGreeting` ヘルパーを追加（コンポーネントの外）**

```ts
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'おはようございます 👋';
  if (h < 18) return 'こんにちは ☀️';
  return 'こんばんは 🌙';
}
```

- [ ] **Step 3: JSX を以下に差し替え**

```tsx
return (
  <SafeAreaView style={styles.container}>
    <View style={styles.inner}>

      {/* 挨拶 */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>{getGreeting()}</Text>
        <Text style={styles.greetingSub}>今日もケアを続けよう</Text>
      </View>

      {/* 進捗カード */}
      <View style={[styles.progressCard, Shadow.card]}>
        <Text style={styles.progressLabel}>今日の進捗</Text>
        <Text style={styles.progressText}>
          {completedMin}<Text style={styles.progressTotal}> / {prescription.totalMinutes}分</Text>
        </Text>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progressRatio * 100}%` as any }]}
          />
        </View>
      </View>

      {/* メインボタン */}
      {isCompleted ? (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>🎉 今日のストレッチ完了！</Text>
        </View>
      ) : (
        <Pressable style={styles.startButton} onPress={handleStart}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.startButtonInner, Shadow.button]}
          >
            <Text style={styles.startButtonText}>▶　ストレッチを始める</Text>
            <Text style={styles.startButtonSub}>残り {remainingMin} 分</Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* サブアクション */}
      <Pressable style={styles.subButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.subButtonText}>別のストレッチをやる</Text>
      </Pressable>

    </View>

    <GoalSelectorModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      onStart={handleGoalStart}
    />
  </SafeAreaView>
);
```

- [ ] **Step 4: `styles` を以下に全差し替え**

```ts
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMain },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 32, gap: 20 },
  greeting: { gap: 4 },
  greetingText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  greetingSub: { fontSize: 12, color: Colors.textMuted },
  progressCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  progressLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  progressText: { fontSize: 36, fontWeight: 'bold', color: Colors.textPrimary },
  progressTotal: { fontSize: 16, color: Colors.textMuted, fontWeight: 'normal' },
  progressBarBg: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    height: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: Radius.full,
    height: 6,
  },
  startButton: { borderRadius: Radius.lg, overflow: 'hidden' },
  startButtonInner: {
    borderRadius: Radius.lg,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
  },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  startButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  completedBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    paddingVertical: 24,
    alignItems: 'center',
  },
  completedText: { fontSize: 18, fontWeight: 'bold', color: Colors.primaryDeep },
  subButton: {
    paddingVertical: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
  },
  subButtonText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
```

- [ ] **Step 5: Expo Go で起動して目視確認**

```bash
npx expo start
```

ホーム画面がクリーム背景、テラコッタCTAで表示されることを確認する。

- [ ] **Step 6: コミット**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: restyle HomeScreen with Warm Wellness tokens"
```

---

## Task 5: CountdownTimer + SessionScreen リスタイル

**Files:**
- Modify: `src/components/CountdownTimer.tsx`
- Modify: `src/screens/SessionScreen.tsx`

- [ ] **Step 1: `CountdownTimer.tsx` のグリーンをトークンに差し替え**

import に追加:
```tsx
import { Colors } from '../styles/tokens';
```

`stroke="#e0e0e0"` の行を変更:
```tsx
stroke={Colors.primaryLight}
```

`stroke="#4CAF50"` の行を変更:
```tsx
stroke={Colors.primary}
```

`styles.number` の `color: '#2E7D32'` を変更:
```ts
number: { fontSize: 36, fontWeight: 'bold', color: Colors.primary },
```

`styles.label` の `color: '#555'` を変更:
```ts
label: { fontSize: 12, color: Colors.textMuted },
```

- [ ] **Step 2: `SessionScreen.tsx` の import を更新**

先頭に追加:
```tsx
import { Colors, Radius, Shadow } from '../styles/tokens';
```

- [ ] **Step 3: SessionScreen の JSX を更新**

ヘッダーの `endBtn` テキストの色を変更:
```tsx
<TouchableOpacity onPress={handleEnd}>
  <Text style={styles.endBtn}>終了</Text>
</TouchableOpacity>
```

名前の直下にボディパーツラベルを追加:
```tsx
<Text style={styles.name}>{current.nameJa}</Text>
<Text style={styles.bodyPartLabel}>{current.bodyParts.join(' · ')}</Text>
```

一時停止ボタンとスキップを同行に並べる（絶対配置のスキップボタンを削除し、インラインに）:

```tsx
{readyCount === null && (
  <View style={styles.actionRow}>
    <TouchableOpacity style={styles.pauseBtn} onPress={() => setPaused((p) => !p)}>
      <Text style={styles.pauseText}>{paused ? '▶  再開' : '⏸  一時停止'}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.skipBtnInline} onPress={advance}>
      <Text style={styles.skipText}>スキップ →</Text>
    </TouchableOpacity>
  </View>
)}
```

既存の `{readyCount === null && (<TouchableOpacity style={styles.skipBtn} ...>)}` ブロックを削除する。

- [ ] **Step 4: SessionScreen の `styles` を全差し替え**

```ts
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMain },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  progress: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
  endBtn: { fontSize: 15, color: Colors.primaryDeep, fontWeight: 'bold' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 100 },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  bodyPartLabel: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 8 },
  readyContainer: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginVertical: 20,
  },
  readyNumber: { fontSize: 64, fontWeight: 'bold', color: Colors.primaryDeep },
  readyLabel: { fontSize: 14, color: Colors.primary, marginTop: 4 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingHorizontal: 8, marginBottom: 16,
  },
  pauseBtn: {
    backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 20,
  },
  pauseText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  skipBtnInline: { paddingVertical: 10, paddingHorizontal: 12 },
  skipText: { fontSize: 15, color: Colors.primary, fontWeight: 'bold' },
  desc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, width: '100%' },
  step: { fontSize: 14, color: Colors.textSecondary, alignSelf: 'flex-start', marginTop: 8, lineHeight: 20 },
});
```

- [ ] **Step 5: Expo Go で目視確認（タイマーリングがテラコッタ、操作ボタンが横並び）**

- [ ] **Step 6: コミット**

```bash
git add src/components/CountdownTimer.tsx src/screens/SessionScreen.tsx
git commit -m "feat: restyle CountdownTimer and SessionScreen"
```

---

## Task 6: CompletionScreen + GateScreen リスタイル

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`
- Modify: `src/screens/GateScreen.tsx`

- [ ] **Step 1: `CompletionScreen.tsx` を差し替え**

```tsx
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleNextStretchNotification } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';
import { ALL_STRETCHES } from '../data/stretches';
import { Colors, Radius, Shadow } from '../styles/tokens';
import PrimaryButton from '../components/PrimaryButton';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Completion'>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { markStretchesCompleted, recordStretchCompletion, schedulerConfig } = useUserStore();

  const ids = route.params.completedStretchIds;
  const totalSeconds = ids.reduce((sum, id) => {
    const s = ALL_STRETCHES.find((s) => s.id === id);
    return sum + (s?.durationSeconds ?? 0);
  }, 0);
  const totalMin = Math.max(1, Math.ceil(totalSeconds / 60));

  useEffect(() => {
    markStretchesCompleted(ids);
    recordStretchCompletion();
    scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>お疲れ様でした！</Text>
      <Text style={styles.sub}>継続することが大切です</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, Shadow.card]}>
          <Text style={styles.statValue}>{ids.length}</Text>
          <Text style={styles.statLabel}>種目</Text>
        </View>
        <View style={[styles.statCard, Shadow.card]}>
          <Text style={styles.statValue}>{totalMin}分</Text>
          <Text style={styles.statLabel}>セッション</Text>
        </View>
      </View>
      <PrimaryButton
        label="ホームに戻る"
        onPress={() => navigation.navigate('Main')}
        style={styles.button}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgMain, padding: 24 },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  sub: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 40 },
  statCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    paddingVertical: 16, paddingHorizontal: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  button: { width: '100%' },
});
```

- [ ] **Step 2: `GateScreen.tsx` を差し替え**

```tsx
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
import { Colors, Radius, Shadow } from '../styles/tokens';
import PrimaryButton from '../components/PrimaryButton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GateScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene, sport, schedulerConfig, lastStretchCompletedAt, dailySkipUsed, lastSkipDate, recordSkip } = useUserStore();
  const [skipVisible, setSkipVisible] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const effectiveSkipUsed = dailySkipUsed && lastSkipDate === today;

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

  async function handleSkip() {
    recordSkip();
    await scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig);
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.icon}>🧘</Text>
      <Text style={styles.title}>ストレッチの時間です</Text>
      <Text style={styles.elapsed}>{elapsedText}</Text>
      <View style={[styles.listCard, Shadow.card]}>
        {stretchIds.map((id) => {
          const stretch = ALL_STRETCHES.find((s) => s.id === id);
          return stretch ? (
            <Text key={id} style={styles.item}>・{stretch.nameJa}</Text>
          ) : null;
        })}
      </View>
      <PrimaryButton
        label="▶　今すぐストレッチする"
        onPress={() => navigation.navigate('Session', { stretchIds })}
        style={styles.startBtn}
      />
      {skipVisible && !effectiveSkipUsed && (
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>スキップ（本日あと 1 回）</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgMain, padding: 24 },
  icon: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 6 },
  elapsed: { fontSize: 13, color: Colors.textMuted, marginBottom: 24 },
  listCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: 16, alignSelf: 'stretch', marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border,
  },
  item: { fontSize: 15, color: Colors.textSecondary, marginBottom: 8, lineHeight: 22 },
  startBtn: { alignSelf: 'stretch', marginBottom: 16 },
  skipText: { fontSize: 13, color: Colors.textMuted },
});
```

- [ ] **Step 3: Expo Go で目視確認**

- [ ] **Step 4: コミット**

```bash
git add src/screens/CompletionScreen.tsx src/screens/GateScreen.tsx
git commit -m "feat: restyle CompletionScreen and GateScreen"
```

---

## Task 7: SettingsScreen リスタイル

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: import を更新**

以下を追加:
```tsx
import { Colors, Radius } from '../styles/tokens';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
```

- [ ] **Step 2: navigation を追加（コンポーネント内）**

```tsx
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
```

- [ ] **Step 3: プロフィールセクションの JSX を編集可能行に変更**

既存の `<View style={styles.infoRow}>` × 2 を以下に差し替え:

```tsx
<Text style={styles.sectionTitle}>プロフィール</Text>
<View style={styles.editableSection}>
  <TouchableOpacity
    style={styles.editRow}
    onPress={() => navigation.navigate('EditScene')}
  >
    <Text style={styles.label}>シーン</Text>
    <View style={styles.editRowRight}>
      <Text style={styles.editValue}>{SCENE_LABEL[scene] ?? scene}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.editRow, { borderBottomWidth: 0 }]}
    onPress={() => navigation.navigate('EditBodyParts')}
  >
    <Text style={styles.label}>気になる部位</Text>
    <View style={styles.editRowRight}>
      <Text style={styles.editValue}>{bodyParts.map((b) => BODY_LABEL[b] ?? b).join('・')}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  </TouchableOpacity>
</View>
```

- [ ] **Step 4: `styles` に差し替え**

既存 `styles` を以下に全差し替え:
```ts
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMain, padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: Colors.textPrimary },
  sectionTitle: {
    fontSize: 11, fontWeight: 'bold', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 24, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard, paddingHorizontal: 14, borderRadius: Radius.sm,
    marginBottom: 2,
  },
  label: { fontSize: 16, color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 4 },
  countPicker: { flexDirection: 'row', gap: 6 },
  countBtn: {
    width: 36, height: 36, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  countBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  countBtnText: { fontSize: 15, color: Colors.textSecondary },
  countBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeAdj: { fontSize: 20, color: Colors.primary, fontWeight: 'bold', paddingHorizontal: 4 },
  timeVal: { fontSize: 15, color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  timeSep: { fontSize: 14, color: Colors.textMuted },
  editableSection: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  editRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  editRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editValue: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  chevron: { fontSize: 18, color: Colors.textMuted },
});
```

`Switch` の `trackColor` prop を追加:
```tsx
<Switch
  value={schedulerConfig.enabled}
  onValueChange={(v) => updateSchedulerConfig({ enabled: v })}
  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
  thumbColor={schedulerConfig.enabled ? Colors.primary : '#fff'}
/>
```

通知 Switch にも同様に追加:
```tsx
<Switch
  value={notificationEnabled}
  onValueChange={toggleNotifications}
  disabled={loading}
  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
  thumbColor={notificationEnabled ? Colors.primary : '#fff'}
/>
```

- [ ] **Step 5: Expo Go で目視確認（プロフィール行が `›` 付き、タップで EditScene/EditBodyParts が開く）**

- [ ] **Step 6: コミット**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: restyle SettingsScreen with editable profile rows"
```

---

## Task 8: Onboarding Step1・Step2・Step3 リスタイル

**Files:**
- Modify: `src/screens/onboarding/Step1BodyParts.tsx`
- Modify: `src/screens/onboarding/Step2Scene.tsx`
- Modify: `src/screens/onboarding/Step3Sport.tsx`

- [ ] **Step 1: `Step1BodyParts.tsx` を差し替え**

```tsx
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import PrimaryButton from '../../components/PrimaryButton';
import { useUserStore } from '../../store/useUserStore';
import { BodyPart, OnboardingStackParamList } from '../../types';
import { Colors, Radius } from '../../styles/tokens';

const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'neck',    label: '首' },
  { id: 'shoulder',label: '肩' },
  { id: 'back',    label: '腰・背中' },
  { id: 'hip',     label: '股関節' },
  { id: 'leg',     label: '脚' },
  { id: 'arm',     label: '腕' },
  { id: 'chest',   label: '胸' },
  { id: 'core',    label: '体幹' },
];

type Props = { navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step1'> };

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
      <OnboardingProgressBar current={1} total={4} />
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
      <PrimaryButton label="次へ" onPress={handleNext} disabled={selected.length === 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40 },
  chip: { borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: 20 },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 16, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primaryDeep, fontWeight: 'bold' },
});
```

- [ ] **Step 2: `Step2Scene.tsx` を差し替え**

```tsx
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList, Scene } from '../../types';
import { Colors, Radius } from '../../styles/tokens';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home',   label: '自宅ライト',   emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious',label: '本格ケア',     emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

type Props = { navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step2'> };

export default function Step2Scene({ navigation }: Props) {
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.navigate('Step3Sport');
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar current={2} total={4} />
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
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: Colors.textPrimary },
  list: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  emoji: { fontSize: 32 },
  label: { fontSize: 17, fontWeight: 'bold', color: Colors.textPrimary },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
```

- [ ] **Step 3: `Step3Sport.tsx` の import / styles を更新**

先頭に追加:
```tsx
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Colors, Radius } from '../../styles/tokens';
```

`<SafeAreaView style={styles.container}>` の直後に追加:
```tsx
<OnboardingProgressBar current={3} total={4} />
```

`styles` を以下に全差し替え:
```ts
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMain, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
    marginBottom: 12, backgroundColor: Colors.bgCard, color: Colors.textPrimary,
  },
  list: { flex: 1 },
  suggestion: {
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  suggestionText: { fontSize: 16, color: Colors.textPrimary },
  skip: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: Colors.textMuted, fontSize: 15 },
});
```

- [ ] **Step 4: Expo Go でオンボーディング画面を目視確認（ステップバーが表示される）**

- [ ] **Step 5: コミット**

```bash
git add src/screens/onboarding/Step1BodyParts.tsx src/screens/onboarding/Step2Scene.tsx src/screens/onboarding/Step3Sport.tsx
git commit -m "feat: restyle onboarding Step1-Step3 with progress bar"
```

---

## Task 9: Step4Notifications リスタイル + 時間調整UI

**Files:**
- Modify: `src/screens/onboarding/Step4Notifications.tsx`

- [ ] **Step 1: `Step4Notifications.tsx` を差し替え**

```tsx
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import PrimaryButton from '../../components/PrimaryButton';
import { requestPermissions, scheduleNotifications } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';
import { Colors, Radius, Shadow } from '../../styles/tokens';

const INITIAL_TIMES = ['09:00', '13:00', '18:00'];

function adjustHour(timeStr: string, delta: number): string {
  const [h] = timeStr.split(':').map(Number);
  return `${String(((h + delta + 24) % 24)).padStart(2, '0')}:00`;
}

export default function Step4Notifications() {
  const { completeOnboarding, setNotificationEnabled, setNotificationTimes } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [times, setTimes] = useState<string[]>(INITIAL_TIMES);

  function updateTime(index: number, delta: number) {
    setTimes((prev) => prev.map((t, i) => (i === index ? adjustHour(t, delta) : t)));
  }

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
    await scheduleNotifications(times);
    setNotificationEnabled(true);
    setNotificationTimes(times);
    completeOnboarding();
    setLoading(false);
  }

  function handleSkip() {
    setNotificationEnabled(false);
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar current={4} total={4} />
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>時間を調整できます</Text>
      <View style={styles.timesRow}>
        {times.map((t, i) => (
          <View key={i} style={[styles.timeCard, Shadow.card]}>
            <TouchableOpacity onPress={() => updateTime(i, 1)} style={styles.adj}>
              <Text style={styles.adjText}>＋</Text>
            </TouchableOpacity>
            <Text style={styles.timeText}>{t}</Text>
            <TouchableOpacity onPress={() => updateTime(i, -1)} style={styles.adj}>
              <Text style={styles.adjText}>−</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <Text style={styles.note}>通知時間は後から設定で変更できます</Text>
      <PrimaryButton
        label={loading ? '設定中...' : '通知を有効にする'}
        onPress={handleEnable}
        disabled={loading}
        style={styles.button}
      />
      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  timesRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  timeCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', minWidth: 80,
  },
  adj: { paddingVertical: 4 },
  adjText: { fontSize: 20, color: Colors.primary, fontWeight: 'bold' },
  timeText: { fontSize: 20, fontWeight: '700', color: Colors.primary, marginVertical: 4 },
  note: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: 32 },
  button: { marginBottom: 16 },
  skip: { alignItems: 'center' },
  skipText: { color: Colors.textMuted, fontSize: 15 },
});
```

- [ ] **Step 2: Expo Go でオンボーディングをStep4まで進めて時間調整UIを確認**

各時間カードの ＋/− で時間が変わること、完了後ホームに遷移することを確認。

- [ ] **Step 3: コミット**

```bash
git add src/screens/onboarding/Step4Notifications.tsx
git commit -m "feat: restyle Step4 with adjustable time picker UI"
```

---

## 完了確認チェックリスト

- [ ] `expo-linear-gradient` が `package.json` に追加されている
- [ ] `src/styles/tokens.ts` が存在し、グリーン系カラーが一切含まれない
- [ ] 全画面の背景が `Colors.bgMain` (#FFF8F2) または `Colors.bgCard` になっている
- [ ] CTAボタンがすべて `PrimaryButton` または `LinearGradient` でテラコッタグラデーションになっている
- [ ] `#4CAF50`, `#2E7D32`, `#1B5E20`, `#E8F5E9`, `#C8E6C9` の文字列が `src/screens/` と `src/components/` に残っていない
- [ ] オンボーディング全画面にステップバーが表示される
- [ ] 設定画面のシーン・部位行をタップで編集モーダルが開く
- [ ] 全テストが通る: `npx jest --no-coverage`

```bash
grep -r '#4CAF50\|#2E7D32\|#1B5E20\|#E8F5E9\|#C8E6C9' src/screens/ src/components/
```

このコマンドで出力がなければ移行完了。
