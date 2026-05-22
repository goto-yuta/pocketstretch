import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList, Scene } from '../../types';
import { Colors, Radius } from '../../styles/tokens';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home',   label: '自宅ライト',   emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious',label: '本格ケア',     emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

type Props = { navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step2'> };

export default function Step2Scene({ navigation }: Props) {
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.navigate('Step3Sport');
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar current={2} total={4} />
      <Text style={styles.title}>シーンを選んでください</Text>
      <View style={styles.list}>
        {SCENES.map(({ id, label, emoji, desc }) => (
          <Pressable key={id} style={styles.card} onPress={() => handleSelect(id)}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={styles.textColumn}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.desc}>{desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: Colors.textPrimary },
  list: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  emoji: { fontSize: 32 },
  textColumn: { flex: 1 },
  label: { fontSize: 17, fontWeight: 'bold', color: Colors.textPrimary },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
