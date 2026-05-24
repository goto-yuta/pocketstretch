import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import PrimaryButton from '../../components/PrimaryButton';
import { ensureNotificationPermission, scheduleNextStretchNotification } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';
import { Colors, Radius, Shadow } from '../../styles/tokens';

export default function Step4Notifications() {
  const { completeOnboarding, schedulerConfig, setSchedulerConfig } = useUserStore();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    try {
      const outcome = await ensureNotificationPermission();
      if (outcome === 'blocked') {
        Alert.alert(
          '通知が許可されていません',
          '設定アプリから通知を許可してください',
          [{ text: '設定を開く', onPress: () => Linking.openSettings() }, { text: 'あとで' }],
        );
        completeOnboarding();
        return;
      }
      if (outcome === 'granted') {
        const enabled = { ...schedulerConfig, enabled: true };
        setSchedulerConfig(enabled);
        await scheduleNextStretchNotification(new Date().toISOString(), enabled);
      } else {
        setSchedulerConfig({ ...schedulerConfig, enabled: false });
      }
      completeOnboarding();
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    setSchedulerConfig({ ...schedulerConfig, enabled: false });
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar current={4} total={4} />
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>
        毎日 {schedulerConfig.activeHoursStart}〜{schedulerConfig.activeHoursEnd} の間に、{schedulerConfig.dailyCount}回お知らせします
      </Text>
      <View style={[styles.infoCard, Shadow.card]}>
        <Text style={styles.infoText}>回数や時間帯は、あとから設定でいつでも変更できます。</Text>
      </View>
      <PrimaryButton
        label={loading ? '設定中...' : '通知を有効にする'}
        onPress={handleEnable}
        disabled={loading}
        style={styles.button}
      />
      <TouchableOpacity onPress={handleSkip} accessibilityRole="button" style={styles.skipBtn}>
        <Text style={styles.skip}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  infoCard: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 32,
  },
  infoText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  button: { marginBottom: 16 },
  skipBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24 },
  skip: { textAlign: 'center', color: Colors.textMuted, fontSize: 15 },
});
