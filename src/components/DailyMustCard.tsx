import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALL_STRETCHES } from '../data/stretches';
import { Prescription, getCompletedMinutes, getSessionStretchIds } from '../utils/prescription';

interface Props {
  prescription: Prescription;
  completedStretchIds: string[];
  onStart: (stretchIds: string[]) => void;
}

export default function DailyMustCard({ prescription, completedStretchIds, onStart }: Props) {
  const completedSet = new Set(completedStretchIds);
  const completedMin = getCompletedMinutes(completedStretchIds, prescription.stretchIds, ALL_STRETCHES);
  const progressRatio = prescription.totalMinutes > 0
    ? Math.min(completedMin / prescription.totalMinutes, 1)
    : 0;
  const isCompleted = progressRatio >= 1;
  const remainingMin = Math.max(prescription.totalMinutes - completedMin, 0);

  function handleStart() {
    const sessionIds = getSessionStretchIds(prescription, completedStretchIds, ALL_STRETCHES);
    if (sessionIds.length > 0) onStart(sessionIds);
  }

  const stretchMap = new Map(ALL_STRETCHES.map((s) => [s.id, s]));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>💊 今日のマスト · {prescription.label}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {completedMin} <Text style={styles.progressTotal}>/ {prescription.totalMinutes}分</Text>
        </Text>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
      </View>

      {isCompleted ? (
        <Text style={styles.completedText}>🎉 今日のマスト達成！</Text>
      ) : (
        <Pressable style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>残り{remainingMin}分やる →</Text>
        </Pressable>
      )}

      <View style={styles.list}>
        {prescription.stretchIds.map((id) => {
          const stretch = stretchMap.get(id);
          if (!stretch) return null;
          const done = completedSet.has(id);
          return (
            <View key={id} style={[styles.listItem, done && styles.listItemDone]}>
              <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                {done && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.listItemText, done && styles.listItemTextDone]}>
                {stretch.nameJa} × {stretch.recommendedSets}セット
              </Text>
              <Text style={styles.listItemDuration}>
                {stretch.durationSeconds * stretch.recommendedSets}秒
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginBottom: 6,
  },
  progressRow: {
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  progressTotal: {
    fontSize: 14,
    opacity: 0.8,
  },
  progressBarBg: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    height: 6,
    marginBottom: 12,
  },
  progressBarFill: {
    backgroundColor: '#fff',
    borderRadius: 4,
    height: 6,
  },
  completedText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  listItemDone: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  checkMark: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  listItemTextDone: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  listItemDuration: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
});
