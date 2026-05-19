# ストレッチメニュー充実 & ゴールセレクター Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「今日の気分で選ぶ」モーダルを追加し、悩み/目的・時間の組み合わせでストレッチを絞り込んでセッションを開始できるようにする。ストレッチも10件追加する。

**Architecture:** Goal型→bodyParts/difficulty/scenesの変換マップを持つ`filterByGoals()`を追加し、Stretchデータ構造は変更しない。GoalSelectorModalはホーム画面からシートとして呼び出し、結果のstretchIdsをSessionに渡す。

**Tech Stack:** React Native (Expo), TypeScript, Jest

---

## File Map

| ファイル | 変更内容 |
|---------|---------|
| `src/types/index.ts` | `Goal`・`DurationFilter` 型を追加 |
| `src/utils/filterStretches.ts` | `filterByGoals()`・`applyDurationFilter()` を追加 |
| `src/data/stretches.ts` | ストレッチ10件追加 |
| `src/components/GoalSelectorModal.tsx` | 新規作成 |
| `src/screens/HomeScreen.tsx` | ボタン追加・モーダル統合 |
| `__tests__/filterStretches.test.ts` | 新関数のテスト追加 |

---

### Task 1: Goal・DurationFilter 型を追加

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: `Goal` と `DurationFilter` を types/index.ts に追加する**

`src/types/index.ts` の末尾（`MainTabParamList` の後）に追記：

```typescript
export type Goal =
  | 'shoulder-stiffness'
  | 'neck-stiffness'
  | 'lower-back-pain'
  | 'drowsiness'
  | 'eye-strain'
  | 'leg-swelling'
  | 'relax'
  | 'focus'
  | 'warmup'
  | 'cooldown'
  | 'mood-change';

export type DurationFilter = '3min' | '5min' | '10min' | 'any';
```

- [ ] **Step 2: TypeScript コンパイルエラーがないか確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし（0 errors）

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Goal and DurationFilter types"
```

---

### Task 2: filterByGoals・applyDurationFilter を追加（TDD）

**Files:**
- Modify: `src/utils/filterStretches.ts`
- Test: `__tests__/filterStretches.test.ts`

- [ ] **Step 1: 失敗テストを書く**

`__tests__/filterStretches.test.ts` の末尾に追記：

```typescript
import { filterByGoals, applyDurationFilter } from '../src/utils/filterStretches';
import { Goal, DurationFilter, Stretch } from '../src/types';

const mockForGoals: Stretch[] = [
  { id: 'a', nameJa: 'A', descriptionJa: '', image: 0, durationSeconds: 30, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'b', nameJa: 'B', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 2, bodyParts: ['shoulder'], scenes: ['home'], steps: [] },
  { id: 'c', nameJa: 'C', descriptionJa: '', image: 0, durationSeconds: 45, difficulty: 3, bodyParts: ['leg'], scenes: ['serious'], steps: [] },
  { id: 'd', nameJa: 'D', descriptionJa: '', image: 0, durationSeconds: 40, difficulty: 1, bodyParts: ['back'], scenes: ['home'], steps: [] },
  { id: 'e', nameJa: 'E', descriptionJa: '', image: 0, durationSeconds: 50, difficulty: 2, bodyParts: ['hip'], scenes: ['home'], steps: [] },
];

describe('filterByGoals', () => {
  it('returns all stretches when goals is empty', () => {
    expect(filterByGoals(mockForGoals, [])).toHaveLength(5);
  });

  it('filters by bodyPart for neck-stiffness', () => {
    const result = filterByGoals(mockForGoals, ['neck-stiffness']);
    expect(result.map(s => s.id)).toEqual(['a']);
  });

  it('merges bodyParts across multiple goals (OR)', () => {
    // shoulder-stiffness = neck|shoulder, neck-stiffness = neck → union = neck|shoulder
    const result = filterByGoals(mockForGoals, ['shoulder-stiffness', 'neck-stiffness']);
    expect(result.map(s => s.id).sort()).toEqual(['a', 'b']);
  });

  it('applies maxDifficulty for relax', () => {
    // relax: maxDifficulty 2 → excludes c (difficulty 3)
    const result = filterByGoals(mockForGoals, ['relax']);
    expect(result.map(s => s.id)).not.toContain('c');
  });

  it('applies minDifficulty for warmup', () => {
    // warmup: minDifficulty 2 → excludes a (difficulty 1), d (difficulty 1)
    const result = filterByGoals(mockForGoals, ['warmup']);
    expect(result.map(s => s.id)).not.toContain('a');
    expect(result.map(s => s.id)).not.toContain('d');
  });

  it('returns all for mood-change (no constraints)', () => {
    expect(filterByGoals(mockForGoals, ['mood-change'])).toHaveLength(5);
  });
});

const mockForDuration: Stretch[] = [
  { id: 'x', nameJa: 'X', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'y', nameJa: 'Y', descriptionJa: '', image: 0, durationSeconds: 90, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
  { id: 'z', nameJa: 'Z', descriptionJa: '', image: 0, durationSeconds: 60, difficulty: 1, bodyParts: ['neck'], scenes: ['office'], steps: [] },
];

describe('applyDurationFilter', () => {
  it('returns all for "any"', () => {
    expect(applyDurationFilter(mockForDuration, 'any')).toHaveLength(3);
  });

  it('stops adding when cumulative seconds would exceed limit', () => {
    // 3min = 180s: x(60) + y(90) = 150 ≤ 180, + z(60) = 210 > 180 → [x, y]
    const result = applyDurationFilter(mockForDuration, '3min');
    expect(result.map(s => s.id)).toEqual(['x', 'y']);
  });

  it('returns empty for empty input', () => {
    expect(applyDurationFilter([], '5min')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `filterByGoals is not a function` のようなエラーで FAIL

- [ ] **Step 3: filterByGoals・applyDurationFilter を実装する**

`src/utils/filterStretches.ts` を以下に差し替える（既存関数はそのまま残す）：

```typescript
import { BodyPart, DurationFilter, Goal, Scene, Stretch } from '../types';

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

interface GoalFilterConfig {
  bodyParts?: BodyPart[];
  maxDifficulty?: 1 | 2 | 3;
  minDifficulty?: 1 | 2 | 3;
  scenes?: Scene[];
}

const GOAL_FILTER_MAP: Record<Goal, GoalFilterConfig> = {
  'shoulder-stiffness': { bodyParts: ['shoulder', 'neck'] },
  'neck-stiffness': { bodyParts: ['neck'] },
  'lower-back-pain': { bodyParts: ['back'] },
  'drowsiness': { bodyParts: ['neck', 'shoulder'], maxDifficulty: 2 },
  'eye-strain': { bodyParts: ['neck'] },
  'leg-swelling': { bodyParts: ['leg', 'hip'] },
  'relax': { maxDifficulty: 2 },
  'focus': { bodyParts: ['neck', 'shoulder'], scenes: ['office', 'home'] },
  'warmup': { minDifficulty: 2 },
  'cooldown': { maxDifficulty: 2 },
  'mood-change': {},
};

const DURATION_SECONDS: Record<DurationFilter, number> = {
  '3min': 180,
  '5min': 300,
  '10min': 600,
  'any': Infinity,
};

export function filterByGoals(stretches: Stretch[], goals: Goal[]): Stretch[] {
  if (goals.length === 0) return stretches;

  const mergedBodyParts = new Set<BodyPart>();
  const mergedScenes = new Set<Scene>();
  let maxDifficulty: number | undefined;
  let minDifficulty: number | undefined;

  for (const goal of goals) {
    const config = GOAL_FILTER_MAP[goal];
    config.bodyParts?.forEach((bp) => mergedBodyParts.add(bp));
    config.scenes?.forEach((sc) => mergedScenes.add(sc));
    if (config.maxDifficulty !== undefined) {
      maxDifficulty = maxDifficulty === undefined ? config.maxDifficulty : Math.min(maxDifficulty, config.maxDifficulty);
    }
    if (config.minDifficulty !== undefined) {
      minDifficulty = minDifficulty === undefined ? config.minDifficulty : Math.max(minDifficulty, config.minDifficulty);
    }
  }

  return stretches.filter((s) => {
    if (mergedBodyParts.size > 0 && !Array.from(mergedBodyParts).some((bp) => s.bodyParts.includes(bp))) return false;
    if (maxDifficulty !== undefined && s.difficulty > maxDifficulty) return false;
    if (minDifficulty !== undefined && s.difficulty < minDifficulty) return false;
    if (mergedScenes.size > 0 && !Array.from(mergedScenes).some((sc) => s.scenes.includes(sc))) return false;
    return true;
  });
}

export function applyDurationFilter(stretches: Stretch[], duration: DurationFilter): Stretch[] {
  const limit = DURATION_SECONDS[duration];
  let total = 0;
  const result: Stretch[] = [];
  for (const s of stretches) {
    if (total + s.durationSeconds <= limit) {
      result.push(s);
      total += s.durationSeconds;
    }
  }
  return result;
}
```

- [ ] **Step 4: テストを実行して全件パスすることを確認**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage 2>&1 | tail -20
```

Expected: 全テスト PASS（既存6件 + 新規9件 = 15件）

- [ ] **Step 5: Commit**

```bash
git add src/utils/filterStretches.ts __tests__/filterStretches.test.ts
git commit -m "feat: add filterByGoals and applyDurationFilter with tests"
```

---

### Task 3: ストレッチ10件追加

**Files:**
- Modify: `src/data/stretches.ts`

- [ ] **Step 1: 10件追加する**

`src/data/stretches.ts` の `ALL_STRETCHES` 配列末尾（`];` の直前）に以下を追加：

```typescript
  // ── 目の疲れ・眠気 (difficulty: 1-2) ──────────────────
  {
    id: 'eye-neck-roll',
    nameJa: '目のための首ゆっくり回し',
    descriptionJa: '目の疲れをほぐすため、首をゆっくり360度回して血行を促進する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['neck'],
    scenes: ['office', 'home', 'serious'],
    steps: ['目を閉じてリラックス', 'ゆっくり首を右に回す（5秒）', 'そのまま後ろ→左→前と1周', '反対回りも1周', '目を開けてゆっくり瞬きする'],
  },
  {
    id: 'energize-full-stretch',
    nameJa: '全身目覚めストレッチ',
    descriptionJa: '仰向けで両手足を伸ばし、全身をぐっと伸ばして眠気を覚ます。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['back', 'leg'],
    scenes: ['home', 'serious'],
    steps: ['床に仰向けになる', '両腕を頭の上に伸ばし、両足も先まで伸ばす', '全身をグッと引き伸ばして5秒キープ', '一気に力を抜く', '3回繰り返す'],
  },
  // ── リラックス・クールダウン (difficulty: 1-2) ──────────
  {
    id: 'child-pose',
    nameJa: 'チャイルドポーズ',
    descriptionJa: '床に膝をついて上体を前に倒し、背中と股関節を深くほぐすリラックスポーズ。',
    image: placeholder,
    durationSeconds: 45,
    difficulty: 2,
    bodyParts: ['back', 'hip'],
    scenes: ['home', 'serious'],
    steps: ['正座から膝を少し広げる', '上体をゆっくり前に倒して両腕を前に伸ばす', '額を床に近づける', '背中全体の伸びを感じながら30秒キープ', 'ゆっくり起き上がる'],
  },
  {
    id: 'supine-knee-hug',
    nameJa: '仰向け膝抱え',
    descriptionJa: '仰向けで両膝を抱えて腰と背中をほぐす、やさしいリラックスポーズ。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 1,
    bodyParts: ['back', 'hip'],
    scenes: ['home', 'serious'],
    steps: ['仰向けに寝る', '両膝を胸に引き寄せ、両手で膝を抱える', '腰が床から少し浮く感じでOK', '背中の丸まりを感じながら20秒キープ', 'ゆっくり足を床に戻す'],
  },
  {
    id: 'quad-stretch',
    nameJa: '太もも前伸ばし',
    descriptionJa: '立って片足を後ろに引き、大腿四頭筋（太もも前側）を伸ばすクールダウン向けストレッチ。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['壁や椅子に手をついてバランスを取る', '右足のかかとをお尻に引き寄せ、右手でつかむ', '太もも前側の伸びを感じながら20秒キープ', '反対側も同様に'],
  },
  {
    id: 'standing-side-stretch',
    nameJa: '立って体側伸ばし',
    descriptionJa: '両足を肩幅に開き、片手を上げて体側をゆっくり伸ばす気分転換にも最適なストレッチ。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['back', 'shoulder'],
    scenes: ['home', 'serious'],
    steps: ['足を肩幅に開いて立つ', '右腕を頭の上に伸ばし、左に体を傾ける', '右脇腹の伸びを感じながら15秒キープ', '反対側も同様に'],
  },
  // ── むくみ解消 (difficulty: 1) ───────────────────────
  {
    id: 'ankle-rotation',
    nameJa: '足首回し（むくみ解消）',
    descriptionJa: '座ったまま足首をゆっくり大きく回し、脚のむくみを促進する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['office', 'home', 'serious'],
    steps: ['椅子に座り右足を床から少し浮かせる', '足首をゆっくり右回りに10回回す', '左回りに10回回す', '反対の足も同様に'],
  },
  {
    id: 'calf-raise-stretch',
    nameJa: 'カーフレイズ＆ストレッチ',
    descriptionJa: '立ってかかとを上げ下げしてふくらはぎをポンプのように動かし、むくみを流す。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 1,
    bodyParts: ['leg', 'hip'],
    scenes: ['office', 'home', 'serious'],
    steps: ['足を肩幅に開いて立つ', 'ゆっくりかかとを上げて10秒キープ', 'ゆっくり下ろす', '10回繰り返す', '最後にアキレス腱を伸ばして終わる'],
  },
  // ── ウォームアップ・気分転換 (difficulty: 2) ─────────────
  {
    id: 'cat-cow',
    nameJa: 'キャット＆カウ',
    descriptionJa: '四つん這いで背骨を丸めた状態と反らせた状態を交互に繰り返し、背中全体を温める。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['back'],
    scenes: ['home', 'serious'],
    steps: ['四つん這いになり手首は肩の下、膝は腰の下に置く', '息を吐きながら背中を丸めて頭を下げる（キャット）', '息を吸いながら背中を反らせて頭を上げる（カウ）', '10回ゆっくり繰り返す'],
  },
  {
    id: 'deep-breath-chest-open',
    nameJa: '深呼吸＋胸開き',
    descriptionJa: '深呼吸しながら両腕を広げて胸を開き、リフレッシュと集中力アップを同時に促す。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['背筋を伸ばして立つ（または座る）', '鼻から4秒かけて息を吸いながら両腕を横に広げる', '胸を大きく開いて2秒止める', '口から6秒かけて息を吐きながら腕を戻す', '5回繰り返す'],
  },
```

- [ ] **Step 2: TypeScript エラーがないか確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: 既存テストがパスすることを確認**

```bash
npx jest __tests__/filterStretches.test.ts --no-coverage 2>&1 | tail -10
```

Expected: 全件 PASS

- [ ] **Step 4: Commit**

```bash
git add src/data/stretches.ts
git commit -m "feat: add 10 stretches for eye-strain, relax, cooldown, warmup, swelling goals"
```

---

### Task 4: GoalSelectorModal を作成

**Files:**
- Create: `src/components/GoalSelectorModal.tsx`

- [ ] **Step 1: GoalSelectorModal.tsx を作成する**

`src/components/GoalSelectorModal.tsx` を以下の内容で作成：

```typescript
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ALL_STRETCHES } from '../data/stretches';
import { DurationFilter, Goal } from '../types';
import { applyDurationFilter, filterByGoals } from '../utils/filterStretches';

interface GoalOption {
  value: Goal;
  emoji: string;
  label: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'shoulder-stiffness', emoji: '🤷', label: '肩こり' },
  { value: 'neck-stiffness', emoji: '😤', label: '首こり' },
  { value: 'lower-back-pain', emoji: '🪑', label: '腰痛' },
  { value: 'drowsiness', emoji: '😴', label: '眠気覚まし' },
  { value: 'eye-strain', emoji: '👀', label: '目の疲れ' },
  { value: 'leg-swelling', emoji: '🦵', label: 'むくみ' },
  { value: 'relax', emoji: '🧘', label: 'リラックス' },
  { value: 'focus', emoji: '🎯', label: '集中力アップ' },
  { value: 'warmup', emoji: '🔥', label: 'ウォームアップ' },
  { value: 'cooldown', emoji: '❄️', label: 'クールダウン' },
  { value: 'mood-change', emoji: '✨', label: '気分転換' },
];

interface DurationOption {
  value: DurationFilter;
  label: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { value: '3min', label: '3分' },
  { value: '5min', label: '5分' },
  { value: '10min', label: '10分' },
  { value: 'any', label: 'おまかせ' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (stretchIds: string[]) => void;
}

export default function GoalSelectorModal({ visible, onClose, onStart }: Props) {
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>('any');

  const filteredStretches = useMemo(() => {
    const byGoal = filterByGoals(ALL_STRETCHES, selectedGoals);
    return applyDurationFilter(byGoal, selectedDuration);
  }, [selectedGoals, selectedDuration]);

  function toggleGoal(goal: Goal) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  function handleStart() {
    if (filteredStretches.length === 0) return;
    onStart(filteredStretches.map((s) => s.id));
  }

  function handleClose() {
    setSelectedGoals([]);
    setSelectedDuration('any');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>今日はどうする？</Text>

          <Text style={styles.sectionLabel}>悩み・目的（複数OK）</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((opt) => {
              const selected = selectedGoals.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleGoal(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>時間</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => {
              const selected = selectedDuration === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.durationChip, selected && styles.chipSelected]}
                  onPress={() => setSelectedDuration(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filteredStretches.length === 0 ? (
            <Text style={styles.emptyText}>条件に合うストレッチが見つかりません</Text>
          ) : (
            <Pressable style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>
                おすすめを見る（{filteredStretches.length}件）
              </Text>
            </Pressable>
          )}

          <Pressable style={styles.skipButton} onPress={handleClose}>
            <Text style={styles.skipText}>スキップ</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  chipText: { fontSize: 14, color: '#555' },
  chipTextSelected: { color: '#2E7D32', fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  startButton: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  skipButton: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  skipText: { color: '#999', fontSize: 14 },
  emptyText: { marginTop: 24, textAlign: 'center', color: '#999', fontSize: 14 },
});
```

- [ ] **Step 2: TypeScript エラーがないか確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/components/GoalSelectorModal.tsx
git commit -m "feat: add GoalSelectorModal component"
```

---

### Task 5: HomeScreen にボタンとモーダルを統合

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: HomeScreen.tsx を修正する**

`src/screens/HomeScreen.tsx` を以下に差し替える：

```typescript
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoalSelectorModal from '../components/GoalSelectorModal';
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
  const [modalVisible, setModalVisible] = useState(false);

  function startSession(stretches: Stretch[]) {
    if (stretches.length === 0) return;
    navigation.navigate('Session', { stretchIds: stretches.map((s) => s.id) });
  }

  function handleGoalStart(stretchIds: string[]) {
    setModalVisible(false);
    navigation.navigate('Session', { stretchIds });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable style={styles.goalButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.goalButtonText}>今日の気分で選ぶ →</Text>
        </Pressable>

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

      <GoalSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStart={handleGoalStart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  goalButton: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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

- [ ] **Step 2: TypeScript エラーがないか確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: 全テストがパスすることを確認**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: 全件 PASS

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: integrate GoalSelectorModal into HomeScreen"
```
