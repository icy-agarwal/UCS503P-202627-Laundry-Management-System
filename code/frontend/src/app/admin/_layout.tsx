import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api';
import { Icon, IconName } from '../../components/Icon';
import { Splash, Btn, Mu, T } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { homeFor } from '../../lib/nav';

const NAV: [string, string, IconName][] = [
  ['dashboard', 'Dashboard', 'dash'], ['batches', 'Batches', 'box'], ['complaints', 'Complaints', 'flag'], ['students', 'Students', 'users'],
  ['staff', 'Staff', 'staff'], ['hostels', 'Hostels & semesters', 'building'], ['categories', 'Categories', 'tag'], ['audit', 'Audit log', 'log'], ['reports', 'Reports', 'chart'],
];

export default function AdminLayout() {
  const { me, logout, status } = useAuth();
  const th = useTheme(), r = useRouter(), path = usePathname(), { width } = useWindowDimensions();
  const cm = useApi(() => (me ? api.listComplaints().catch(() => []) : Promise.resolve([])), [me?.id]);
  if (status === 'loading') return <Splash />;
  if (!me) return <Redirect href="/login" />;
  if (me.role !== 'admin') return <Redirect href={homeFor(me.role) as any} />;
  const wide = width >= 860;
  const open = (cm.data ?? []).filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const items = NAV.map(([k, label, icon]) => {
    const on = path.startsWith(`/admin/${k}`);
    return (
      <Pressable key={k} onPress={() => r.navigate(`/admin/${k}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingHorizontal: 10, borderRadius: 10, backgroundColor: on ? th.blb : 'transparent' }}>
        <Icon name={icon} size={20} color={on ? th.blt : th.mu} />
        <T w="b" size={14} color={on ? th.blt : th.mu} style={{ flexShrink: 0 }}>{label}</T>
        {k === 'complaints' && open ? <View style={{ marginLeft: wide ? 'auto' : 4, minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: th.danger, alignItems: 'center', justifyContent: 'center' }}><T w="x" size={12} color="#fff">{open}</T></View> : null}
      </Pressable>
    );
  });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg, flexDirection: wide ? 'row' : 'column' }}>
      {wide ? (
        <View style={{ width: 244, backgroundColor: th.card, borderRightWidth: 1, borderRightColor: th.bd, padding: 12, paddingTop: 20, gap: 18 }}>
          <View style={{ paddingHorizontal: 8 }}><T w="b" size={17}>Hostel Laundry</T><Mu style={{ fontSize: 13 }}>Admin · Thapar Institute</Mu></View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2 }}>{items}</ScrollView>
          <View style={{ borderTopWidth: 1, borderTopColor: th.bd, paddingTop: 14, paddingHorizontal: 8, gap: 10 }}>
            <View><T w="b">{me.name}</T><Mu>Administrator</Mu></View>
            <Btn small label="Log out" onPress={async () => { await logout(); r.replace('/login'); }} />
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: th.card, borderBottomWidth: 1, borderBottomColor: th.bd }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 4, alignItems: 'center' }}>
            {items}<Btn small label="Log out" onPress={async () => { await logout(); r.replace('/login'); }} />
          </ScrollView>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}><Slot /></View>
    </SafeAreaView>
  );
}
