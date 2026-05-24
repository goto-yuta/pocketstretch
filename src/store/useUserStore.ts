import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, SchedulerConfig, UserProfile } from '../types';
import { getLocalDateString } from '../utils/date';

interface DailyProgress {
  date: string;
  completedStretchIds: string[];
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: true,
  dailyCount: 3,
  activeHoursStart: '08:00',
  activeHoursEnd: '22:00',
};

interface UserStore extends UserProfile {
  dailyProgress: DailyProgress;
  lastStretchCompletedAt: string | null;
  dailySkipUsed: boolean;
  lastSkipDate: string | null;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setSport: (sport: string) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  setSchedulerConfig: (config: SchedulerConfig) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
  recordStretchCompletion: () => void;
  recordSkip: () => void;
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
      schedulerConfig: DEFAULT_SCHEDULER_CONFIG,
      dailyProgress: { date: '', completedStretchIds: [] },
      lastStretchCompletedAt: null,
      dailySkipUsed: false,
      lastSkipDate: null,
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setSport: (sport) => set({ sport }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      setSchedulerConfig: (schedulerConfig) => set({ schedulerConfig }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markStretchesCompleted: (ids) =>
        set((state) => {
          const today = getLocalDateString();
          const existing =
            state.dailyProgress.date === today ? state.dailyProgress.completedStretchIds : [];
          const merged = Array.from(new Set([...existing, ...ids]));
          return { dailyProgress: { date: today, completedStretchIds: merged } };
        }),
      recordStretchCompletion: () =>
        set({ lastStretchCompletedAt: new Date().toISOString() }),
      recordSkip: () =>
        set(() => {
          const today = getLocalDateString();
          return {
            dailySkipUsed: true,
            lastSkipDate: today,
            lastStretchCompletedAt: new Date().toISOString(),
          };
        }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
