import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPermissions, scheduleNotifications } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';

const DEFAULT_TIMES = ['09:00', '13:00', '18:00'];

export default function Step3Notifications() {
  const { completeOnboarding, setNotificationEnabled, setNotificationTimes } = useUserStore();
  const [loading, setLoading] = useState(false);

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
    await scheduleNotifications(DEFAULT_TIMES);
    setNotificationEnabled(true);
    setNotificationTimes(DEFAULT_TIMES);
    completeOnboarding();
    setLoading(false);
    // completeOnboarding() がストアを更新 → RootNavigatorがMainに切り替わる
  }

  function handleSkip() {
    setNotificationEnabled(false);
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>毎日この時間にお知らせします</Text>
      <View style={styles.timesBox}>
        {DEFAULT_TIMES.map((t) => (
          <Text key={t} style={styles.time}>{t}</Text>
        ))}
      </View>
      <Text style={styles.note}>通知時間は後から設定で変更できます</Text>
      <TouchableOpacity style={styles.button} onPress={handleEnable} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '設定中...' : '通知を有効にする'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24 },
  timesBox: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 12 },
  time: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  note: { textAlign: 'center', color: '#aaa', fontSize: 12, marginBottom: 40 },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skip: { alignItems: 'center' },
  skipText: { color: '#aaa', fontSize: 15 },
});
