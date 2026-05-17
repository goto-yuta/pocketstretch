import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import RootNavigator from './src/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // アプリがフォアグラウンドに来るだけでOK — navigatorが状態に基づき制御する
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return <RootNavigator />;
}
