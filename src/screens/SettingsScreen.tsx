import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAllNotifications, requestPermissions, scheduleNotifications } from '../notifications';
import { useUserStore } from '../store/useUserStore';

const SCENE_LABEL: Record<string, string> = {
  office: 'オフィス向け', home: '自宅ライト', serious: '本格ケア',
};
const BODY_LABEL: Record<string, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

export default function SettingsScreen() {
  const {
    notificationEnabled, notificationTimes,
    setNotificationEnabled, setNotificationTimes,
    bodyParts, scene,
  } = useUserStore();
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>設定</Text>

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  label: { fontSize: 16, color: '#333' },
  sub: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#888', marginTop: 24, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  infoLabel: { fontSize: 15, color: '#555' },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '600' },
});
