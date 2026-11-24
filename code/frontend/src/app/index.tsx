import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { homeFor } from '../lib/nav';

export default function Index() {
  const { status, me } = useAuth();
  const th = useTheme();
  if (status === 'loading') return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.bg }}><ActivityIndicator color={th.pr} /></View>;
  return me ? <Redirect href={homeFor(me.role) as any} /> : <Redirect href="/login" />;
}
