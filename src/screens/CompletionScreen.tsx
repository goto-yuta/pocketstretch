import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
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

  const totalMin = useMemo(() => {
    const totalSeconds = ids.reduce((sum, id) => {
      const s = ALL_STRETCHES.find((s) => s.id === id);
      return sum + (s?.durationSeconds ?? 0);
    }, 0);
    return Math.max(1, Math.ceil(totalSeconds / 60));
  }, [ids]);

  useEffect(() => {
    markStretchesCompleted(ids);
    recordStretchCompletion();
    scheduleNextStretchNotification(new Date().toISOString(), schedulerConfig).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
