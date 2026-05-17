import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  durationSeconds: number;
  onComplete: () => void;
  running: boolean;
}

export default function CountdownTimer({ durationSeconds, onComplete, running }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, durationSeconds]);

  return (
    <View style={styles.circle}>
      <Text style={styles.number}>{remaining}</Text>
      <Text style={styles.label}>秒</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#4CAF50',
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 20,
  },
  number: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32' },
  label: { fontSize: 12, color: '#555' },
});
