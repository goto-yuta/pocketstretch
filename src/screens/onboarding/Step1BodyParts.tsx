import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../store/useUserStore';
import { BodyPart, OnboardingStackParamList } from '../../types';

const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'neck', label: '首' },
  { id: 'shoulder', label: '肩' },
  { id: 'back', label: '腰・背中' },
  { id: 'hip', label: '股関節' },
  { id: 'leg', label: '脚' },
];

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Step1'>;
};

export default function Step1BodyParts({ navigation }: Props) {
  const setBodyParts = useUserStore((s) => s.setBodyParts);
  const [selected, setSelected] = useState<BodyPart[]>([]);

  function toggle(part: BodyPart) {
    setSelected((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  function handleNext() {
    if (selected.length === 0) return;
    setBodyParts(selected);
    navigation.navigate('Step2');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>気になる部位を選んでください</Text>
      <Text style={styles.subtitle}>複数選択できます</Text>
      <View style={styles.grid}>
        {BODY_PARTS.map(({ id, label }) => (
          <Pressable
            key={id}
            style={[styles.chip, selected.includes(id) && styles.chipSelected]}
            onPress={() => toggle(id)}
          >
            <Text style={[styles.chipText, selected.includes(id) && styles.chipTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={selected.length === 0}
      >
        <Text style={styles.buttonText}>次へ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40 },
  chip: { borderWidth: 2, borderColor: '#ddd', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20 },
  chipSelected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 16, color: '#555' },
  chipTextSelected: { color: '#2E7D32', fontWeight: 'bold' },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
