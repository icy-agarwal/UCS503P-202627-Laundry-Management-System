import React from 'react';
import { Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { api } from '../../api';
import { Icon, IconName } from '../../components/Icon';
import { Splash, PhoneFrame } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { homeFor } from '../../lib/nav';

export default function StaffLayout() {
  const { me, status } = useAuth();
  const th = useTheme();
  const cm = useApi(() => (me ? api.listComplaints().catch(() => []) : Promise.resolve([])), [me?.id]);
  if (status === 'loading') return <Splash />;
  if (!me) return <Redirect href="/login" />;
  if (me.role !== 'staff') return <Redirect href={homeFor(me.role) as any} />;
  const open = (cm.data ?? []).filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const tab = (title: string, icon: IconName, badge?: number) => ({ title, tabBarBadge: badge || undefined, tabBarIcon: ({ color }: { color: string }) => <Icon name={icon} color={color} /> });
  const hide = { href: null } as const;
  return (
    <PhoneFrame>
      <Tabs screenOptions={{
        headerShown: false, tabBarActiveTintColor: th.pr, tabBarInactiveTintColor: th.mu,
        tabBarStyle: { backgroundColor: th.card, borderTopColor: th.bd, ...(Platform.OS === 'web' ? { height: 66, paddingBottom: 8, paddingTop: 6 } : null) }, tabBarLabelStyle: { fontFamily: 'Manrope_700Bold', fontSize: 11 }, sceneStyle: { backgroundColor: th.bg },
      }}>
        <Tabs.Screen name="home" options={tab('Home', 'home')} />
        <Tabs.Screen name="queues" options={tab('Queues', 'queues')} />
        <Tabs.Screen name="scan" options={tab('Scan', 'qr')} />
        <Tabs.Screen name="complaints" options={tab('Complaints', 'flag', open)} />
        <Tabs.Screen name="search" options={tab('Search', 'search')} />
        <Tabs.Screen name="me" options={hide} />
        <Tabs.Screen name="verify/[id]" options={hide} />
        <Tabs.Screen name="tag/[id]" options={hide} />
        <Tabs.Screen name="batch/[id]" options={hide} />
        <Tabs.Screen name="complaint/[id]" options={hide} />
      </Tabs>
    </PhoneFrame>
  );
}
