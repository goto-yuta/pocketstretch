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
