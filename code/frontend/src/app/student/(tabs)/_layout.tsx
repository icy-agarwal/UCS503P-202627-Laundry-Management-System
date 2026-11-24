import React from 'react';
import { Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Icon } from '../../../components/Icon';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';

export default function StudentTabs() {
  const { me } = useAuth();
  const th = useTheme();
  if (!me?.profile) return <Redirect href="/student/setup" />;
  const tab = (title: string, icon: React.ComponentProps<typeof Icon>['name']) => ({ title, tabBarIcon: ({ color }: { color: string }) => <Icon name={icon} color={color} /> });
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: th.pr, tabBarInactiveTintColor: th.mu,
      tabBarStyle: { backgroundColor: th.card, borderTopColor: th.bd, ...(Platform.OS === 'web' ? { height: 66, paddingBottom: 8, paddingTop: 6 } : null) }, tabBarLabelStyle: { fontFamily: 'Manrope_700Bold', fontSize: 12 },
      sceneStyle: { backgroundColor: th.bg },
    }}>
      <Tabs.Screen name="home" options={tab('Home', 'home')} />
      <Tabs.Screen name="submit" options={tab('Submit', 'submit')} />
      <Tabs.Screen name="history" options={tab('History', 'history')} />
      <Tabs.Screen name="pickup" options={tab('Pickup', 'qr')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'user')} />
    </Tabs>
  );
}
