import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { BodyPart } from '../types';
import { Colors, Radius } from '../styles/tokens';
import PrimaryButton from '../components/PrimaryButton';

const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'neck',    label: '首' },
  { id: 'shoulder',label: '肩' },
  { id: 'back',    label: '腰・背中' },
  { id: 'hip',     label: '股関節' },
  { id: 'leg',     label: '脚' },
  { id: 'arm',     label: '腕' },
  { id: 'chest',   label: '胸' },
  { id: 'core',    label: '体幹' },
];

export default function EditBodyParts() {
  const navigation = useNavigation();
  const { setBodyParts, bodyParts: current } = useUserStore((s) => ({
    setBodyParts: s.setBodyParts,
    bodyParts: s.bodyParts,
  }));
  const [selected, setSelected] = useState<BodyPart[]>(current);

  function toggle(part: BodyPart) {
    setSelected((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  function handleSave() {
    if (selected.length === 0) return;
    setBodyParts(selected);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>部位を変更</Text>
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
      <PrimaryButton
        label="保存"
        onPress={handleSave}
        disabled={selected.length === 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 40 },
  chip: { borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: 20 },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 16, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primaryDeep, fontWeight: 'bold' },
});
