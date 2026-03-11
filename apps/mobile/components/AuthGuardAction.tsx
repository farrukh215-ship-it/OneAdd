import { router } from 'expo-router';
import { PressableProps } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function useRequireAuthAction(action: () => void): PressableProps['onPress'] {
  const { currentUser } = useAuth();

  return () => {
    if (!currentUser) {
      router.push('/auth/phone');
      return;
    }

    action();
  };
}
