import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useUserStore } from '../store/useUserStore';
import { Scene } from '../types';
import { Colors, Radius } from '../styles/tokens';

const SCENES: { id: Scene; label: string; emoji: string; desc: string }[] = [
  { id: 'office', label: 'オフィス向け', emoji: '💼', desc: '座ったままOK・音なしで目立たない' },
  { id: 'home',   label: '自宅ライト',   emoji: '🏠', desc: '立ったり寝たりできる軽めのケア' },
  { id: 'serious',label: '本格ケア',     emoji: '💪', desc: 'しっかり体をほぐしたい日に' },
];

export default function EditScene() {
  const navigation = useNavigation();
  const setScene = useUserStore((s) => s.setScene);

  function handleSelect(scene: Scene) {
    setScene(scene);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>シーンを変更</Text>
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
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bgMain },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: Colors.textPrimary },
  list: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  emoji: { fontSize: 32 },
  label: { fontSize: 17, fontWeight: 'bold', color: Colors.textPrimary },
  desc: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
});
