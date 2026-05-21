import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAllNotifications, requestPermissions, scheduleNextStretchNotification, scheduleNotifications } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { SchedulerConfig } from '../types';
import { calcNextStretchTime } from '../utils/scheduler';

const SCENE_LABEL: Record<string, string> = {
  office: 'オフィス向け', home: '自宅ライト', serious: '本格ケア',
};
const BODY_LABEL: Record<string, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

function formatCountdown(nextDate: Date): string {
  const diff = nextDate.getTime() - Date.now();
  if (diff <= 0) return 'もうすぐ';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `あと ${h} 時間 ${m} 分`;
}

function adjustHour(timeStr: string, delta: number): string {
  const [h] = timeStr.split(':').map(Number);
  const newH = ((h + delta + 24) % 24);
  return `${String(newH).padStart(2, '0')}:00`;
}

export default function SettingsScreen() {
  const {
    notificationEnabled, notificationTimes,
    setNotificationEnabled, setNotificationTimes,
    bodyParts, scene,
    schedulerConfig, setSchedulerConfig,
    lastStretchCompletedAt,
  } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!lastStretchCompletedAt || !schedulerConfig.enabled) {
      setCountdown('');
      return;
    }
    const next = calcNextStretchTime(lastStretchCompletedAt, schedulerConfig);
    setCountdown(formatCountdown(next));
    const id = setInterval(() => setCountdown(formatCountdown(next)), 60000);
    return () => clearInterval(id);
  }, [lastStretchCompletedAt, schedulerConfig]);

  async function toggleNotifications(value: boolean) {
    if (value) {
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
      const times = notificationTimes.length > 0 ? notificationTimes : ['09:00', '13:00', '18:00'];
      await scheduleNotifications(times);
      setNotificationEnabled(true);
      setNotificationTimes(times);
      setLoading(false);
    } else {
      await cancelAllNotifications();
      setNotificationEnabled(false);
    }
  }

  async function updateSchedulerConfig(update: Partial<SchedulerConfig>) {
    const newConfig = { ...schedulerConfig, ...update };
    setSchedulerConfig(newConfig);
    if (newConfig.enabled && lastStretchCompletedAt) {
      await scheduleNextStretchNotification(lastStretchCompletedAt, newConfig).catch(() => {});
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>設定</Text>

      <Text style={styles.sectionTitle}>スケジューラー</Text>
      <View style={styles.row}>
        <Text style={styles.label}>スケジューラー</Text>
        <Switch
          value={schedulerConfig.enabled}
          onValueChange={(v) => updateSchedulerConfig({ enabled: v })}
        />
      </View>

      {schedulerConfig.enabled && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>1日の回数</Text>
            <View style={styles.countPicker}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, schedulerConfig.dailyCount === n && styles.countBtnActive]}
                  onPress={() => updateSchedulerConfig({ dailyCount: n })}
                >
                  <Text style={[styles.countBtnText, schedulerConfig.dailyCount === n && styles.countBtnTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>動作時間帯</Text>
            <View style={styles.timePicker}>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursStart: adjustHour(schedulerConfig.activeHoursStart, -1) })}>
                <Text style={styles.timeAdj}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeVal}>{schedulerConfig.activeHoursStart}</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursStart: adjustHour(schedulerConfig.activeHoursStart, 1) })}>
                <Text style={styles.timeAdj}>＋</Text>
              </TouchableOpacity>
              <Text style={styles.timeSep}>〜</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursEnd: adjustHour(schedulerConfig.activeHoursEnd, -1) })}>
                <Text style={styles.timeAdj}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeVal}>{schedulerConfig.activeHoursEnd}</Text>
              <TouchableOpacity onPress={() => updateSchedulerConfig({ activeHoursEnd: adjustHour(schedulerConfig.activeHoursEnd, 1) })}>
                <Text style={styles.timeAdj}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>

          {countdown !== '' && (
            <Text style={styles.sub}>次のストレッチ: {countdown}</Text>
          )}
        </>
      )}

      <Text style={styles.sectionTitle}>通知</Text>
      <View style={styles.row}>
        <Text style={styles.label}>通知</Text>
        <Switch value={notificationEnabled} onValueChange={toggleNotifications} disabled={loading} />
      </View>
      {notificationEnabled && (
        <Text style={styles.sub}>通知時刻: {notificationTimes.join('  ')}</Text>
      )}

      <Text style={styles.sectionTitle}>現在のプロフィール</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>シーン</Text>
        <Text style={styles.infoValue}>{SCENE_LABEL[scene]}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>気になる部位</Text>
        <Text style={styles.infoValue}>{bodyParts.map((b) => BODY_LABEL[b]).join('・')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#888', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  label: { fontSize: 16, color: '#333' },
  sub: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 4 },
  countPicker: { flexDirection: 'row', gap: 6 },
  countBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  countBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  countBtnText: { fontSize: 15, color: '#555' },
  countBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeAdj: { fontSize: 20, color: '#4CAF50', fontWeight: 'bold', paddingHorizontal: 4 },
  timeVal: { fontSize: 15, color: '#333', minWidth: 44, textAlign: 'center' },
  timeSep: { fontSize: 14, color: '#999' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  infoLabel: { fontSize: 15, color: '#555' },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '600' },
});
