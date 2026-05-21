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

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function GateScreen() {
  const navigation = useNavigation<Nav>();
  const {
    bodyParts, scene, sport,
    schedulerConfig, lastStretchCompletedAt,
    dailySkipUsed, recordSkip,
  } = useUserStore();
  const [skipVisible, setSkipVisible] = useState(false);

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

  function handleStart() {
    navigation.navigate('Session', { stretchIds });
  }

  async function handleSkip() {
    recordSkip();
    await scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig);
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ストレッチの時間です</Text>
      <Text style={styles.elapsed}>{elapsedText}</Text>
      <View style={styles.list}>
        {stretchIds.map((id) => {
          const stretch = ALL_STRETCHES.find((s) => s.id === id);
          return stretch ? (
            <Text key={id} style={styles.item}>・{stretch.nameJa}</Text>
          ) : null;
        })}
      </View>
      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startText}>▶  今すぐストレッチする</Text>
      </TouchableOpacity>
      {skipVisible && !dailySkipUsed && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>スキップ（本日あと 1 回）</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  elapsed: { fontSize: 14, color: '#888', marginBottom: 32 },
  list: { marginBottom: 32, alignSelf: 'stretch' },
  item: { fontSize: 16, color: '#555', marginBottom: 10 },
  startBtn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16,
  },
  startText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  skipBtn: { marginTop: 8 },
  skipText: { fontSize: 14, color: '#aaa' },
});
