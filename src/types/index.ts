export type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg';
export type Scene = 'office' | 'home' | 'serious';

export interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: number; // require() result
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];
  recommendedSets: 1 | 2 | 3;
}

export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  notificationEnabled: boolean;
  notificationTimes: string[]; // ["09:00", "14:00"]
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
};

export type OnboardingStackParamList = {
  Step1: undefined;
  Step2: undefined;
  Step3: undefined;
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
  | 'mood-change';

export type DurationFilter = '3min' | '5min' | '10min' | 'any';
