import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cancelAllNotifications, requestPermissions, scheduleNextStretchNotification, scheduleNotifications } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { Colors, Radius } from '../styles/tokens';
import { DISCLAIMER_FULL } from '../data/disclaimer';
import { RootStackParamList, SchedulerConfig } from '../types';
import { calcNextStretchTime } from '../utils/scheduler';

const SCENE_LABEL: Record<string, string> = {
  office: 'オフィス向け', home: '自宅ライト', serious: '本格ケア',
};
const BODY_LABEL: Record<string, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
  arm: '腕', chest: '胸', core: '体幹',
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
          thumbColor={schedulerConfig.enabled ? Colors.primary : Colors.bgCard}
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
        <Switch
          value={notificationEnabled}
          onValueChange={toggleNotifications}
          disabled={loading}
          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
          thumbColor={notificationEnabled ? Colors.primary : Colors.bgCard}
        />
      </View>
      {notificationEnabled && (
        <Text style={styles.sub}>通知時刻: {notificationTimes.join('  ')}</Text>
      )}

      <Text style={styles.sectionTitle}>プロフィール</Text>
      <View style={styles.editableSection}>
        <TouchableOpacity
          style={styles.editRow}
          onPress={() => navigation.navigate('EditScene')}
        >
          <Text style={styles.label}>シーン</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.editValue}>{SCENE_LABEL[scene] ?? scene}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editRowLast}
          onPress={() => navigation.navigate('EditBodyParts')}
        >
          <Text style={styles.label}>気になる部位</Text>
          <View style={styles.editRowRight}>
            <Text style={styles.editValue}>{bodyParts.map((b) => BODY_LABEL[b] ?? b).join('・')}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text style={styles.disclaimer}>{DISCLAIMER_FULL}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMain, padding: 16 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: Colors.textPrimary },
  sectionTitle: {
    fontSize: 11, fontWeight: 'bold', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 24, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgCard, paddingHorizontal: 14, borderRadius: Radius.sm,
    marginBottom: 2,
  },
  label: { fontSize: 16, color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 4 },
  countPicker: { flexDirection: 'row', gap: 6 },
  countBtn: {
    width: 36, height: 36, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  countBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  countBtnText: { fontSize: 15, color: Colors.textSecondary },
  countBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeAdj: { fontSize: 20, color: Colors.primary, fontWeight: 'bold', paddingHorizontal: 4 },
  timeVal: { fontSize: 15, color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  timeSep: { fontSize: 14, color: Colors.textMuted },
  editableSection: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  editRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderColor: Colors.border,
  },
  editRowLast: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: 0,
  },
  editRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editValue: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  chevron: { fontSize: 18, color: Colors.textMuted },
  disclaimer: { fontSize: 11, color: Colors.textMuted, lineHeight: 17, marginTop: 28, marginBottom: 8 },
});
