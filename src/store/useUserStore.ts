import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, SchedulerConfig, UserProfile } from '../types';
import { getLocalDateString } from '../utils/date';
import { nextStreakState, StreakState } from '../utils/streak';

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
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastCompletedDate: string | null;
  lastReviewRequestAt: string | null;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setSport: (sport: string) => void;
  setSchedulerConfig: (config: SchedulerConfig) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
  recordStretchCompletion: () => void;
  recordSkip: () => void;
  recordReviewRequest: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      schedulerConfig: DEFAULT_SCHEDULER_CONFIG,
      dailyProgress: { date: '', completedStretchIds: [] },
      lastStretchCompletedAt: null,
      dailySkipUsed: false,
      lastSkipDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastCompletedDate: null,
      lastReviewRequestAt: null,
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setSport: (sport) => set({ sport }),
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
        set((state) => {
          const prev: StreakState = {
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
            totalSessions: state.totalSessions,
            lastCompletedDate: state.lastCompletedDate,
          };
          const next = nextStreakState(prev, getLocalDateString());
          return { ...next, lastStretchCompletedAt: new Date().toISOString() };
        }),
      recordSkip: () =>
        set(() => {
          const today = getLocalDateString();
          return {
            dailySkipUsed: true,
            lastSkipDate: today,
            lastStretchCompletedAt: new Date().toISOString(),
          };
        }),
      recordReviewRequest: () => set({ lastReviewRequestAt: new Date().toISOString() }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        let state = persisted;
        if (fromVersion < 1) {
          state = { ...state, currentStreak: 0, longestStreak: 0, totalSessions: 0, lastCompletedDate: null };
        }
        if (fromVersion < 2) {
          state = { ...state, lastReviewRequestAt: null };
        }
        return state;
      },
    },
  ),
);
