import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_STRETCHES } from '../data/stretches';
import { scheduleNextStretchNotification } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';
import { getPrescription } from '../utils/prescription';
import { getLocalDateString } from '../utils/date';
import { shouldShowGate } from '../utils/scheduler';
import { Colors, Radius, Shadow } from '../styles/tokens';
import PrimaryButton from '../components/PrimaryButton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GateScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene, sport, schedulerConfig, lastStretchCompletedAt, dailySkipUsed, lastSkipDate, recordSkip } = useUserStore();
  const [skipVisible, setSkipVisible] = useState(false);

  const today = getLocalDateString();
  const effectiveSkipUsed = dailySkipUsed && lastSkipDate === today;

  useEffect(() => {
    const timer = setTimeout(() => setSkipVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldShowGate(lastStretchCompletedAt, schedulerConfig)) {
      navigation.navigate('Main');
    }
  }, [lastStretchCompletedAt, schedulerConfig, navigation]);

  const stretchIds = useMemo(
    () => getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined).stretchIds.slice(0, 3),
    [bodyParts, scene, sport]
  );

  const elapsedText = useMemo(() => {
    if (!lastStretchCompletedAt) return '今日最初のストレッチです';
    const totalHours = (Date.now() - new Date(lastStretchCompletedAt).getTime()) / (1000 * 60 * 60);
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    return `前回から ${h} 時間 ${m} 分経ちました`;
  }, [lastStretchCompletedAt]);

  const handleSkip = useCallback(async () => {
    recordSkip();
    await scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig);
    navigation.navigate('Main');
  }, [recordSkip, schedulerConfig, navigation]);

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
