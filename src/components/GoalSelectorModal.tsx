import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ALL_STRETCHES } from '../data/stretches';
import { Colors, Radius } from '../styles/tokens';
import { DurationFilter, Goal } from '../types';
import { applyDurationFilter, filterByGoals } from '../utils/filterStretches';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  { value: 'morning', emoji: '🌅', label: '朝活' },
  { value: 'bedtime', emoji: '🌙', label: '就寝前' },
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
    const ids = filteredStretches.map((s) => s.id);
    setSelectedGoals([]);
    setSelectedDuration('any');
    onStart(ids);
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
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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
          </ScrollView>
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
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgMain,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primaryDeep, fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgMain,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  startButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  skipButton: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  skipText: { color: Colors.textMuted, fontSize: 14 },
  emptyText: { marginTop: 24, textAlign: 'center', color: Colors.textMuted, fontSize: 14 },
});
