import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BodyPart } from '../types';

const BODY_CONFIG: Record<BodyPart, { emoji: string; bg: string; accent: string; label: string }> = {
  neck:     { emoji: '🦒', bg: '#FFF3E0', accent: '#E8874A', label: '首' },
  shoulder: { emoji: '🏋️', bg: '#EDE8F5', accent: '#9B72CF', label: '肩' },
  back:     { emoji: '🧘', bg: '#F5EDE0', accent: '#D4614A', label: '腰・背中' },
  hip:      { emoji: '🦵', bg: '#FDE8E8', accent: '#C62828', label: '股関節' },
  leg:      { emoji: '🏃', bg: '#E0F5F0', accent: '#00796B', label: '脚' },
  arm:      { emoji: '💪', bg: '#F3E5F5', accent: '#7B1FA2', label: '腕' },
  chest:    { emoji: '🫁', bg: '#E3F2FD', accent: '#1565C0', label: '胸' },
  core:     { emoji: '⚡', bg: '#FFFDE7', accent: '#F57F17', label: '体幹' },
};

interface Props {
  bodyParts: BodyPart[];
  nameJa: string;
  steps: string[];
}

export default function StretchImage({ bodyParts, nameJa, steps }: Props) {
  const primary = bodyParts[0] ?? 'back';
  const { emoji, bg, accent, label } = BODY_CONFIG[primary];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.headerText}>
          <View style={[styles.partBadge, { backgroundColor: accent }]}>
            <Text style={styles.partBadgeText}>{label}</Text>
          </View>
          <Text style={[styles.name, { color: accent }]} numberOfLines={2}>{nameJa}</Text>
        </View>
      </View>

      {steps.length > 0 && (
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: accent }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  emoji: {
    fontSize: 48,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  partBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  partBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  steps: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#3D2010',
    lineHeight: 20,
  },
});
