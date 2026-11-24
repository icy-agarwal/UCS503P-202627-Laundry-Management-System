import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import { AuthProvider } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ToastProvider } from '../components/ui';

export default function Root() {
  const th = useTheme();
  const [loaded, error] = useFonts({ Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: th.bg }} />;
  return (
    <SafeAreaProvider>
      <View style={[{ flex: 1, backgroundColor: th.bg }, Platform.OS === 'web' ? ({ height: '100dvh' } as any) : null]}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: th.bg } }} />
        </ToastProvider>
      </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
