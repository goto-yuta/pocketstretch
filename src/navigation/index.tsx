import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useUserStore } from '../store/useUserStore';
import { MainTabParamList, OnboardingStackParamList, RootStackParamList } from '../types';
import { shouldShowGate } from '../utils/scheduler';
import Step1BodyParts from '../screens/onboarding/Step1BodyParts';
import Step2Scene from '../screens/onboarding/Step2Scene';
import Step3Sport from '../screens/onboarding/Step3Sport';
import Step4Notifications from '../screens/onboarding/Step4Notifications';
import GateScreen from '../screens/GateScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionScreen from '../screens/SessionScreen';
import CompletionScreen from '../screens/CompletionScreen';
import EditScene from '../screens/EditScene';
import EditBodyParts from '../screens/EditBodyParts';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Step1" component={Step1BodyParts} />
      <OnboardingStack.Screen name="Step2" component={Step2Scene} />
      <OnboardingStack.Screen name="Step3Sport" component={Step3Sport} />
      <OnboardingStack.Screen name="Step4" component={Step4Notifications} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);
  const lastStretchCompletedAt = useUserStore((s) => s.lastStretchCompletedAt);
  const schedulerConfig = useUserStore((s) => s.schedulerConfig);
  const gateNeeded = shouldShowGate(lastStretchCompletedAt, schedulerConfig);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            {gateNeeded && (
              <RootStack.Screen
                name="Gate"
                component={GateScreen}
                options={{ gestureEnabled: false }}
              />
            )}
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Session"
              component={SessionScreen}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <RootStack.Screen name="Completion" component={CompletionScreen} />
            <RootStack.Screen
              name="EditScene"
              component={EditScene}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="EditBodyParts"
              component={EditBodyParts}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
