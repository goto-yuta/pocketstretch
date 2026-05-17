import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALL_STRETCHES } from '../data/stretches';
import { useUserStore } from '../store/useUserStore';
import { BodyPart, RootStackParamList, Scene, Stretch } from '../types';
import { filterStretches, getRecommended } from '../utils/filterStretches';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCENE_LABELS: Record<Scene, string> = {
  office: '💼 オフィス',
  home: '🏠 自宅',
  serious: '💪 本格',
};

const BODY_LABELS: Record<BodyPart, string> = {
  neck: '首', shoulder: '肩', back: '腰', hip: '股関節', leg: '脚',
};

function StretchCard({ stretch, onPress }: { stretch: Stretch; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={stretch.image} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{stretch.nameJa}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{stretch.descriptionJa}</Text>
        <Text style={styles.cardDuration}>{stretch.durationSeconds}秒</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { bodyParts, scene } = useUserStore();
  const recommended = getRecommended(ALL_STRETCHES, bodyParts, scene);

  function startSession(stretches: Stretch[]) {
    if (stretches.length === 0) return;
    navigation.navigate('Session', { stretchIds: stretches.map((s) => s.id) });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>今日のおすすめ</Text>
        {recommended.map((s) => (
          <StretchCard key={s.id} stretch={s} onPress={() => startSession([s])} />
        ))}
        {recommended.length > 1 && (
          <Pressable style={styles.startAll} onPress={() => startSession(recommended)}>
            <Text style={styles.startAllText}>おすすめ全部やる</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>シーンで探す</Text>
        <View style={styles.row}>
          {(['office', 'home', 'serious'] as Scene[]).map((sc) => (
            <Pressable
              key={sc}
              style={styles.sceneChip}
              onPress={() => startSession(filterStretches(ALL_STRETCHES, { scene: sc }))}
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
              onPress={() => startSession(filterStretches(ALL_STRETCHES, { bodyParts: [bp] }))}
            >
              <Text style={styles.bodyChipText}>{BODY_LABELS[bp]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', margin: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  card: { flexDirection: 'row', margin: 8, marginHorizontal: 16, borderRadius: 12, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  cardImage: { width: 80, height: 80 },
  cardBody: { flex: 1, padding: 10, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  cardDuration: { fontSize: 12, color: '#4CAF50', marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  sceneChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  sceneChipText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  bodyChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8' },
  bodyChipText: { fontSize: 14, color: '#6A1B9A', fontWeight: '600' },
  startAll: { margin: 16, backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startAllText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
