import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoalSelectorModal from '../components/GoalSelectorModal';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';
import { getPrescription, getCompletedMinutes, getSessionStretchIds } from '../utils/prescription';
import { Colors, Radius, Shadow } from '../styles/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'おはようございます 👋';
  if (h < 18) return 'こんにちは ☀️';
  return 'こんばんは 🌙';
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene, sport, dailyProgress } = useUserStore();
  const [modalVisible, setModalVisible] = useState(false);

  const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined);
  const completedMin = getCompletedMinutes(dailyProgress.completedStretchIds, prescription.stretchIds, ALL_STRETCHES);
  const remainingMin = Math.max(prescription.totalMinutes - completedMin, 0);
  const isCompleted = remainingMin === 0 && prescription.totalMinutes > 0;
  const progressRatio = prescription.totalMinutes > 0
    ? Math.min(completedMin / prescription.totalMinutes, 1)
    : 0;

  function handleStart() {
    const ids = getSessionStretchIds(prescription, dailyProgress.completedStretchIds, ALL_STRETCHES);
    if (ids.length > 0) navigation.navigate('Session', { stretchIds: ids });
  }

  function handleGoalStart(stretchIds: string[]) {
    setModalVisible(false);
    navigation.navigate('Session', { stretchIds });
  }

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
}

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
