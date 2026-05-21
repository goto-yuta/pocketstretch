import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleNextStretchNotification } from '../notifications';
import { useUserStore } from '../store/useUserStore';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Completion'>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    markStretchesCompleted,
    recordStretchCompletion,
    schedulerConfig,
  } = useUserStore();

  useEffect(() => {
    markStretchesCompleted(route.params.completedStretchIds);
    recordStretchCompletion();
    const now = new Date().toISOString();
    scheduleNextStretchNotification(now, schedulerConfig).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>お疲れ様でした！</Text>
      <Text style={styles.sub}>ストレッチ完了です。継続することが大切です。</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Main')}>
        <Text style={styles.buttonText}>ホームに戻る</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  sub: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
