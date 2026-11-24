import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { Splash, PhoneFrame } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { homeFor } from '../../lib/nav';

export default function StudentLayout() {
  const { me, status } = useAuth();
  const th = useTheme();
  if (status === 'loading') return <Splash />;
  if (!me) return <Redirect href="/login" />;
  if (me.role !== 'student') return <Redirect href={homeFor(me.role) as any} />;
  return <PhoneFrame><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: th.bg } }} /></PhoneFrame>;
}
