import 'react-native-gesture-handler';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { RootErrorBoundary } from '../components/RootErrorBoundary';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [loaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 1000 * 60 * 60 * 12,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  // Do not block initial render on font loading, otherwise startup can look like a white-screen hang.
  void loaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }} />
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}
