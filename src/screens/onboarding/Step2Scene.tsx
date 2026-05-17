import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList, Scene } from '../../types';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home', label: '自宅ライト', emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious', label: '本格ケア', emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step2'>;
};

export default function Step2Scene({ navigation }: Props) {
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.navigate('Step3');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>シーンを選んでください</Text>
      <View style={styles.list}>
        {SCENES.map(({ id, label, emoji, desc }) => (
          <Pressable key={id} style={styles.card} onPress={() => handleSelect(id)}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View>
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
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  list: { gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#eee', backgroundColor: '#fafafa' },
  emoji: { fontSize: 32 },
  label: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  desc: { fontSize: 13, color: '#888', marginTop: 4 },
});
