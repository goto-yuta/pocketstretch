import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DailyMustCard from '../components/DailyMustCard';
import GoalSelectorModal from '../components/GoalSelectorModal';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { BodyPart, RootStackParamList, Scene } from '../types';
import { getPrescription } from '../utils/prescription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCENE_LABELS: Record<Scene, string> = {
  office: '💼 オフィス',
  home: '🏠 自宅',
  serious: '💪 本格',
};

const BODY_LABELS: Record<BodyPart, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene, sport, dailyProgress } = useUserStore();
  const [modalVisible, setModalVisible] = useState(false);

  const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined);

  function startSession(stretchIds: string[]) {
    if (stretchIds.length === 0) return;
    navigation.navigate('Session', { stretchIds });
  }

  function handleGoalStart(stretchIds: string[]) {
    setModalVisible(false);
    navigation.navigate('Session', { stretchIds });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {prescription.stretchIds.length > 0 && (
          <DailyMustCard
            prescription={prescription}
            completedStretchIds={dailyProgress.completedStretchIds}
            onStart={startSession}
          />
        )}

        <Pressable style={styles.goalButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.goalButtonText}>今日の気分で選ぶ →</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>シーンで探す</Text>
        <View style={styles.row}>
          {(['office', 'home', 'serious'] as Scene[]).map((sc) => (
            <Pressable
              key={sc}
              style={styles.sceneChip}
              onPress={() => startSession(ALL_STRETCHES.filter((s) => s.scenes.includes(sc)).map((s) => s.id))}
            >
              <Text style={styles.sceneChipText}>{SCENE_LABELS[sc]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>部位で探す</Text>
        <View style={styles.row}>
          {(Object.keys(BODY_LABELS) as BodyPart[]).map((bp) => (
            <Pressable
              key={bp}
              style={styles.bodyChip}
              onPress={() => startSession(ALL_STRETCHES.filter((s) => s.bodyParts.includes(bp)).map((s) => s.id))}
            >
              <Text style={styles.bodyChipText}>{BODY_LABELS[bp]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <GoalSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStart={handleGoalStart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  goalButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  sceneChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  sceneChipText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  bodyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8' },
  bodyChipText: { fontSize: 14, color: '#6A1B9A', fontWeight: '600' },
});
