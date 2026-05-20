import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountdownTimer from '../components/CountdownTimer';
import { ALL_STRETCHES } from '../data/stretches';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Session'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionScreen() {
  useKeepAwake();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  // mapを使って重複IDを保持（同じストレッチを複数セット実行できる）
  const stretches = route.params.stretchIds
    .map((id) => ALL_STRETCHES.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(true);

  const current = stretches[index];

  function advance() {
    if (index + 1 >= stretches.length) {
      const uniqueIds = Array.from(new Set(stretches.map((s) => s.id)));
      navigation.replace('Completion', { completedStretchIds: uniqueIds });
    } else {
      setRunning(false);
      setIndex((i) => i + 1);
      setTimeout(() => setRunning(true), 400);
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
        <TouchableOpacity onPress={handleEnd}>
          <Text style={styles.endBtn}>終了</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={current.image} style={styles.image} resizeMode="contain" />
        <Text style={styles.name}>{current.nameJa}</Text>
        <CountdownTimer
          key={index}
          durationSeconds={current.durationSeconds}
          running={running}
          onComplete={advance}
        />
        <Text style={styles.desc}>{current.descriptionJa}</Text>
        {current.steps.map((step, i) => (
          <Text key={i} style={styles.step}>・{step}</Text>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.skipBtn} onPress={advance}>
        <Text style={styles.skipText}>スキップ →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  progress: { fontSize: 16, color: '#555' },
  endBtn: { fontSize: 15, color: '#F44336', fontWeight: 'bold' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 100 },
  image: { width: '100%', height: 220, marginBottom: 20, borderRadius: 16 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  step: { fontSize: 14, color: '#666', alignSelf: 'flex-start', marginTop: 8, lineHeight: 20 },
  skipBtn: { position: 'absolute', bottom: 32, right: 24 },
  skipText: { fontSize: 15, color: '#4CAF50', fontWeight: 'bold' },
});
