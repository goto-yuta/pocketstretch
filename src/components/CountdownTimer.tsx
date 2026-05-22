import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../styles/tokens';

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
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemaining(durationSeconds);
    dashOffset.setValue(0);
    animRef.current?.stop();
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      animRef.current?.stop();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        animRef.current?.stop();
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          animRef.current = Animated.timing(dashOffset, {
            toValue: CIRCUM,
            duration: 950,
            useNativeDriver: false,
          });
          animRef.current.start();
          onCompleteRef.current();
          return 0;
        }
        const next = r - 1;
        animRef.current = Animated.timing(dashOffset, {
          toValue: CIRCUM * (1 - next / durationSeconds),
          duration: 950,
          useNativeDriver: false,
        });
        animRef.current.start();
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      animRef.current?.stop();
    };
  }, [running, durationSeconds]);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={Colors.primaryLight}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={Colors.primary}
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
  number: { fontSize: 36, fontWeight: 'bold', color: Colors.primary },
  label: { fontSize: 12, color: Colors.textMuted },
});
