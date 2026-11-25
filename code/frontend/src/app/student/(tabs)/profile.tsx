import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api';
import { Avatar, Btn, Card, H2, Row, Screen, T, useToast } from '../../../components/ui';
import { Icon, IconName } from '../../../components/Icon';
import { Kv } from '../../../components/Bits';
import { DAY_SHORT } from '../../../constants/domain';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { initials, rollOf } from '../../../lib/format';
import { Pressable } from 'react-native';

export default function Profile() {
  const { me, logout } = useAuth();
  const r = useRouter(), th = useTheme(), toast = useToast();
  const cfg = useApi(() => api.config());
  const p = me!.profile!;
  const hostel = cfg.data?.hostels.find((h) => h.id === p.hostelId);
  const sem = p.semester ?? cfg.data?.semesters.find((s) => s.current)?.name ?? '—';
  const item = (label: string, icon: IconName, onPress: () => void, danger?: boolean, last?: boolean) => (
    <Pressable key={label} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: last ? 0 : 1, borderBottomColor: th.bd }}>
      <Row start gap={12}><Icon name={icon} size={20} color={danger ? th.rdt : th.tx} /><T w="b" color={danger ? th.rdt : th.tx}>{label}</T></Row>
      <Icon name="chev" size={18} color={th.mu} />
    </Pressable>
  );
  return (
    <Screen>
      <View style={{ backgroundColor: th.hero1, borderRadius: 18, padding: 16 }}>
        <Row start gap={14}>
          <Avatar size={60} text={initials(p.name)} tint="rgba(255,255,255,0.2)" />
          <View><H2 color="#fff" size={20}>{p.name}</H2><T size={14} color="rgba(255,255,255,0.82)">{rollOf(me!.email)}</T></View>
        </Row>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        <Kv k="Hostel" v={hostel?.name ?? '—'} /><Kv k="Room number" v={p.room} />
        <Kv k="Laundry day" v={hostel ? `${DAY_SHORT[hostel.days[0]]} & ${DAY_SHORT[hostel.days[1]]}` : '—'} />
        <Kv k="Semester" v={sem} />{p.admissionYear ? <Kv k="Admission year" v={String(p.admissionYear)} /> : null}<Kv k="Email" v={me!.email} /><Kv k="Phone" v={`+91 ${p.phone}`} last />
      </Card>
      <Btn label="Edit profile" onPress={() => r.push('/student/setup')} />
      <Card style={{ paddingVertical: 0 }}>
        {item('Notifications', 'bell', () => r.push('/student/notifications'))}
        {item('My Complaints', 'history', () => r.push('/student/complaints'))}
        {item('Help & Support', 'pin', () => toast('Help & Support — coming in the next phase'))}
        {item('Log Out', 'back', async () => { await logout(); r.replace('/login'); }, true, true)}
      </Card>
    </Screen>
  );
}
