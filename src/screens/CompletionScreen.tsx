import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CompletionScreen() {
  const navigation = useNavigation<Nav>();
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
