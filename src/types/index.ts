export type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg' | 'arm' | 'chest' | 'core';
export type Scene = 'office' | 'home' | 'serious';

export interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: number;
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];
  recommendedSets: 1 | 2 | 3;
  sport?: string[];
}

export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  sport: string;
  notificationEnabled: boolean;
  notificationTimes: string[];
  schedulerConfig: SchedulerConfig;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Gate: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
  EditScene: undefined;
  EditBodyParts: undefined;
};

export type OnboardingStackParamList = {
  Step1: undefined;
  Step2: undefined;
  Step3Sport: undefined;
  Step4: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type Goal =
  | 'shoulder-stiffness'
  | 'neck-stiffness'
  | 'lower-back-pain'
  | 'drowsiness'
  | 'eye-strain'
  | 'leg-swelling'
  | 'relax'
  | 'focus'
  | 'warmup'
  | 'cooldown'
  | 'mood-change'
  | 'morning'
  | 'bedtime';

export type DurationFilter = '3min' | '5min' | '10min' | 'any';

export interface SchedulerConfig {
  enabled: boolean;
  dailyCount: 1 | 2 | 3 | 4 | 5;
  activeHoursStart: string; // "HH:MM"
  activeHoursEnd: string;   // "HH:MM"
}
