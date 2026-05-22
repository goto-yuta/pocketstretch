import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BodyPart } from '../types';

const BODY_CONFIG: Record<BodyPart, { emoji: string; bg: string; accent: string }> = {
  neck:     { emoji: '🦒', bg: '#FFF3E0', accent: '#FF8F00' },
  shoulder: { emoji: '🏋️', bg: '#E8EAF6', accent: '#3949AB' },
  back:     { emoji: '🧘', bg: '#F5EDE0', accent: '#8B5E3C' },
  hip:      { emoji: '🦵', bg: '#FCE4EC', accent: '#C62828' },
  leg:      { emoji: '🏃', bg: '#E0F7FA', accent: '#00838F' },
  arm:      { emoji: '💪', bg: '#F3E5F5', accent: '#6A1B9A' },
  chest:    { emoji: '🫁', bg: '#E3F2FD', accent: '#1565C0' },
  core:     { emoji: '⚡', bg: '#FFFDE7', accent: '#F57F17' },
};

interface Props {
  bodyParts: BodyPart[];
  nameJa: string;
  size?: number;
}

export default function StretchImage({ bodyParts, nameJa, size = 220 }: Props) {
  const primary = bodyParts[0] ?? 'back';
  const { emoji, bg, accent } = BODY_CONFIG[primary];

  return (
    <View style={[styles.container, { width: '100%', height: size, backgroundColor: bg }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={[styles.badge, { backgroundColor: accent }]}>
        <Text style={styles.badgeText}>{nameJa}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 72 },
  badge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
