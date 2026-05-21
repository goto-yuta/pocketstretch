import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SPORT_SUGGESTIONS, normalizeSport } from '../../utils/prescription';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

export default function Step3Sport() {
  const navigation = useNavigation<Nav>();
  const setSport = useUserStore((s) => s.setSport);
  const [input, setInput] = useState('');

  const filtered = input.trim().length === 0
    ? SPORT_SUGGESTIONS
    : SPORT_SUGGESTIONS.filter((s) =>
        s.label.includes(input) || s.key.toLowerCase().includes(input.toLowerCase())
      );

  function handleSelect(key: string) {
    setSport(key);
    navigation.navigate('Step4');
  }

  function handleSkip() {
    setSport('');
    navigation.navigate('Step4');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>スポーツを教えてください</Text>
      <Text style={styles.subtitle}>取り組んでいるスポーツに合わせたケアを処方します</Text>

      <TextInput
        style={styles.input}
        placeholder="例：ランニング、ゴルフ、サッカー…"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        returnKeyType="done"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.suggestion} onPress={() => handleSelect(item.key)}>
            <Text style={styles.suggestionText}>{item.label}</Text>
          </Pressable>
        )}
        style={styles.list}
      />

      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  list: { flex: 1 },
  suggestion: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: { fontSize: 16, color: '#333' },
  skip: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: '#aaa', fontSize: 15 },
});
