import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../styles/tokens';

interface Props {
  current: number;
  total: number;
}

export default function OnboardingProgressBar({ current, total }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i < current ? styles.active : styles.inactive]}
          />
        ))}
      </View>
      <Text style={styles.label}>{current} / {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  segments: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  segment: { flex: 1, height: 4, borderRadius: Radius.full },
  active: { backgroundColor: Colors.primary },
  inactive: { backgroundColor: Colors.primaryLight },
  label: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
});
