# セッションタイマー強化 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** セッション画面のカウントダウンタイマーを SVG リングアニメーションに置き換え、一時停止・再開ボタンを追加する。

**Architecture:** `CountdownTimer` コンポーネントを `react-native-svg` の `AnimatedCircle` で書き直してリングを描画し、`SessionScreen` に `paused` state と一時停止ボタンを追加する。タイマーの interface（props）は変更しないため `SessionScreen` 側の変更は最小限。

**Tech Stack:** React Native + Expo 54、react-native-svg、React Native Animated API

---

## ファイル構成

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/components/CountdownTimer.tsx` | 修正 | SVG リングアニメーション追加、サイズ拡大 |
| `src/screens/SessionScreen.tsx` | 修正 | `paused` state + 一時停止ボタン追加 |

---

## Task 1: react-native-svg をインストール

**Files:**
- Modify: `package.json`（expo install が自動更新）

- [ ] **Step 1: インストール**

```bash
cd /Users/goto/.superset/worktrees/drstretch/iodized-ground
npx expo install react-native-svg
```

Expected: `package.json` に `"react-native-svg": "..."` が追加される

- [ ] **Step 2: インストール確認**

```bash
grep "react-native-svg" package.json
```

Expected: バージョン番号付きで表示される（例: `"react-native-svg": "15.x.x"`）

- [ ] **Step 3: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過（jest transform に `react-native-svg` は既存設定済み）

- [ ] **Step 4: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-native-svg dependency"
```

---

## Task 2: CountdownTimer を SVG リングに置き換え

**Files:**
- Modify: `src/components/CountdownTimer.tsx`

現在の実装（`src/components/CountdownTimer.tsx`）:
- 100×100px の丸い View に数字を表示するだけのシンプルな実装
- props: `durationSeconds: number`, `onComplete: () => void`, `running: boolean`

**この props interface は変えない。** SessionScreen 側の呼び出しコードはそのまま。

- [ ] **Step 1: `src/components/CountdownTimer.tsx` を以下で完全置換**

定数:
- `SIZE = 160` — コンポーネントの縦横サイズ（px）
- `STROKE = 8` — リングの線の太さ（px）
- `RADIUS = (SIZE - STROKE) / 2` = 76 — SVG円の半径
- `CIRCUM = 2 * Math.PI * RADIUS` ≈ 477.5 — 円周

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  durationSeconds: number;
  onComplete: () => void;
  running: boolean;
}

const SIZE = 160;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUM = 2 * Math.PI * RADIUS;

export default function CountdownTimer({ durationSeconds, onComplete, running }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const dashOffset = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
    dashOffset.setValue(0);
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
          Animated.timing(dashOffset, {
            toValue: CIRCUM,
            duration: 900,
            useNativeDriver: false,
          }).start();
          onComplete();
          return 0;
        }
        const next = r - 1;
        Animated.timing(dashOffset, {
          toValue: CIRCUM * (1 - next / durationSeconds),
          duration: 900,
          useNativeDriver: false,
        }).start();
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, durationSeconds]);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#e0e0e0"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#4CAF50"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUM} ${CIRCUM}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.textOverlay}>
        <Text style={styles.number}>{remaining}</Text>
        <Text style={styles.label}>秒</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  number: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32' },
  label: { fontSize: 12, color: '#555' },
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
git add src/components/CountdownTimer.tsx
git commit -m "feat: replace CountdownTimer with SVG ring animation"
```

---

## Task 3: SessionScreen に一時停止ボタンを追加

**Files:**
- Modify: `src/screens/SessionScreen.tsx`

現在の `SessionScreen` の構造:
- `running` state: ストレッチ遷移時の 400ms リセット用
- `CountdownTimer` に `running={running}` を渡している

このタスクでは:
1. `paused` state を追加
2. CountdownTimer に `running={running && !paused}` を渡す
3. `advance` 関数で `setPaused(false)` を呼ぶ
4. タイマーの下に一時停止ボタンを追加

- [ ] **Step 1: `src/screens/SessionScreen.tsx` を以下で完全置換**

```typescript
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
  const stretches = route.params.stretchIds
    .map((id) => ALL_STRETCHES.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);

  const current = stretches[index];

  function advance() {
    setPaused(false);
    if (index + 1 >= stretches.length) {
      const uniqueIds = Array.from(new Set(stretches.map((s) => s.id)));
      navigation.replace('Completion', { completedStretchIds: uniqueIds });
    } else {
      setRunning(false);
      setIndex((i) => i + 1);
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
          running={running && !paused}
          onComplete={advance}
        />
        <TouchableOpacity style={styles.pauseBtn} onPress={() => setPaused((p) => !p)}>
          <Text style={styles.pauseText}>{paused ? '▶  再開' : '⏸  一時停止'}</Text>
        </TouchableOpacity>
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
  pauseBtn: { marginBottom: 16 },
  pauseText: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold' },
  desc: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  step: { fontSize: 14, color: '#666', alignSelf: 'flex-start', marginTop: 8, lineHeight: 20 },
  skipBtn: { position: 'absolute', bottom: 32, right: 24 },
  skipText: { fontSize: 15, color: '#4CAF50', fontWeight: 'bold' },
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
git add src/screens/SessionScreen.tsx
git commit -m "feat: add pause/resume button to SessionScreen"
```

---

## Self-Review

**スペックカバレッジ確認:**
- ✅ SVG リングアニメーション → Task 2
- ✅ 背景リング（グレー）＋前景リング（グリーン） → Task 2 Step 1
- ✅ 12時位置から時計回り（rotation="-90"） → Task 2 Step 1
- ✅ 一時停止ボタン（⏸ / ▶） → Task 3 Step 1
- ✅ 一時停止中はタイマー停止 → Task 3 Step 1（`running && !paused`）
- ✅ 次のストレッチへ進むとき一時停止リセット → Task 3 Step 1（`advance` で `setPaused(false)`）
- ✅ スキップでも一時停止リセット → Task 3 Step 1（スキップボタンが `advance` を呼ぶ）
- ✅ react-native-svg 依存追加 → Task 1

**プレースホルダースキャン:** なし

**型整合性確認:**
- `CountdownTimer` の props interface 変更なし → SessionScreen の呼び出しは `running={running && !paused}` 1行変更のみ ✅
- `AnimatedCircle` は `Animated.createAnimatedComponent(Circle)` で作成 ✅
- `dashOffset` は `Animated.Value` → `strokeDashoffset` に直接渡せる ✅
