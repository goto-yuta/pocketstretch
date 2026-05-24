import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountdownTimer from '../components/CountdownTimer';
import StretchImage from '../components/StretchImage';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { Colors, Radius } from '../styles/tokens';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionScreen() {
  useKeepAwake();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { markStretchesCompleted, recordStretchCompletion } = useUserStore();
  const stretches = route.params.stretchIds
    .map((id) => ALL_STRETCHES.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [readyCount, setReadyCount] = useState<number | null>(3);
  const readyRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    startReady();
    return () => { if (readyRef.current) clearInterval(readyRef.current); };
  }, [index]);

  function startReady() {
    setRunning(false);
    setPaused(false);
    setReadyCount(3);
    let count = 3;
    readyRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(readyRef.current!);
        setReadyCount(null);
        setRunning(true);
      } else {
        setReadyCount(count);
      }
    }, 1000);
  }

  const current = stretches[index];

  function advance() {
    setPaused(false);
    if (index + 1 >= stretches.length) {
      if (completedRef.current) return;
      completedRef.current = true;
      const uniqueIds = Array.from(new Set(stretches.map((s) => s.id)));
      markStretchesCompleted(uniqueIds);
      recordStretchCompletion();
      navigation.replace('Completion', { completedStretchIds: uniqueIds });
    } else {
      setRunning(false);
      setIndex((i) => i + 1);
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
        <TouchableOpacity
          onPress={handleEnd}
          accessibilityRole="button"
          accessibilityLabel="セッションを終了"
        >
          <Text style={styles.endBtn}>終了</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <StretchImage bodyParts={current.bodyParts} nameJa={current.nameJa} steps={current.steps} />
        <Text style={styles.name}>{current.nameJa}</Text>
        <Text style={styles.bodyPartLabel}>{current.bodyParts.join(' · ')}</Text>

        {readyCount !== null ? (
          <View style={styles.readyContainer}>
            <Text style={styles.readyNumber}>{readyCount}</Text>
            <Text style={styles.readyLabel}>準備して</Text>
          </View>
        ) : (
          <>
            <CountdownTimer
              key={index}
              durationSeconds={current.durationSeconds}
              running={running && !paused}
              onComplete={advance}
            />
            {readyCount === null && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.pauseBtn}
                  onPress={() => setPaused((p) => !p)}
                  accessibilityRole="button"
                  accessibilityLabel={paused ? 'ストレッチを再開' : 'ストレッチを一時停止'}
                >
                  <Text style={styles.pauseText}>{paused ? '▶  再開' : '⏸  一時停止'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipBtnInline}
                  onPress={advance}
                  accessibilityRole="button"
                  accessibilityLabel="次のストレッチへスキップ"
                >
                  <Text style={styles.skipText}>スキップ →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <Text style={styles.desc}>{current.descriptionJa}</Text>
      </ScrollView>

    </SafeAreaView>
  );
}

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
  desc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, width: '100%' },
});
