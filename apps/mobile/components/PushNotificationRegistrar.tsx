import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { isOnboardingComplete } from '../lib/mobile-preferences';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

export function PushNotificationRegistrar() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !isOnboardingComplete()) return;

    let active = true;

    const register = async () => {
      if (!Device.isDevice) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted' || !active) return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      if (!active || !token.data) return;

      await api.post('/auth/push-token', {
        token: token.data,
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      });
    };

    void register();

    return () => {
      active = false;
    };
  }, [currentUser]);

  return null;
}
