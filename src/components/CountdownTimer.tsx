import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  durationSeconds: number;
  onComplete: () => void;
  running: boolean;
}

const SIZE = 160;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUM = 2 * Math.PI * RADIUS;

export default function CountdownTimer({ durationSeconds, onComplete, running }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const dashOffset = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
    dashOffset.setValue(0);
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
          Animated.timing(dashOffset, {
            toValue: CIRCUM,
            duration: 900,
            useNativeDriver: false,
          }).start();
          onComplete();
          return 0;
        }
        const next = r - 1;
        Animated.timing(dashOffset, {
          toValue: CIRCUM * (1 - next / durationSeconds),
          duration: 900,
          useNativeDriver: false,
        }).start();
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, durationSeconds]);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#e0e0e0"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#4CAF50"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUM} ${CIRCUM}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.textOverlay}>
        <Text style={styles.number}>{remaining}</Text>
        <Text style={styles.label}>秒</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  number: { fontSize: 36, fontWeight: 'bold', color: '#2E7D32' },
  label: { fontSize: 12, color: '#555' },
});
