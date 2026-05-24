import { type EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import RootNavigator, { navigationRef, goToGateIfDue } from './src/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function navigateFromResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const screen = (response.notification.request.content.data as { screen?: string })?.screen;
  // Reminders now use data.screen==='Gate'. We still accept legacy 'Session' payloads but
  // always route through Gate — navigating straight to 'Session' would crash (it needs stretchIds params).
  if (screen === 'Gate' || screen === 'Session') {
    if (navigationRef.isReady()) navigationRef.navigate('Gate');
  }
}

export default function App() {
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(navigateFromResponse);
    responseListener.current = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') goToGateIfDue();
    });
    return () => {
      responseListener.current?.remove();
      appStateSub.remove();
    };
  }, []);

  return <RootNavigator />;
}
