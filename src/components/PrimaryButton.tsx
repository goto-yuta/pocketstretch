import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../styles/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({ label, onPress, disabled = false, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={disabled ? [Colors.border, Colors.border] : [Colors.primary, Colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, Shadow.button]}
      >
        <Text style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  textDisabled: { color: Colors.textSecondary },
});
