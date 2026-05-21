import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, UserProfile } from '../types';

interface DailyProgress {
  date: string;
  completedStretchIds: string[];
}

interface UserStore extends UserProfile {
  dailyProgress: DailyProgress;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setSport: (sport: string) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      notificationEnabled: false,
      notificationTimes: [],
      dailyProgress: { date: '', completedStretchIds: [] },
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setSport: (sport) => set({ sport }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markStretchesCompleted: (ids) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const existing =
            state.dailyProgress.date === today ? state.dailyProgress.completedStretchIds : [];
          const merged = Array.from(new Set([...existing, ...ids]));
          return { dailyProgress: { date: today, completedStretchIds: merged } };
        }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
