import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api';
import { Avatar, Btn, Card, H2, Header, Mu, Row, Screen } from '../../components/ui';
import { Kv } from '../../components/Bits';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../lib/format';

export default function StaffMe() {
  const { me, logout } = useAuth();
  const r = useRouter();
  const cfg = useApi(() => api.config());
  return (
    <Screen>
      <Header title="Profile" fallback="/staff/home" />
      <Row start gap={14}><Avatar size={56} text={initials(me!.name)} /><View><H2 size={20}>{me!.name}</H2><Mu>Laundry staff</Mu></View></Row>
      <Card style={{ paddingVertical: 4 }}>
        <Kv k="Counter" v={cfg.data?.hostels.find((h) => h.id === me!.hostelId)?.name ?? '—'} /><Kv k="Email" v={me!.email} last />
      </Card>
      <Btn kind="danger" label="Log Out" onPress={async () => { await logout(); r.replace('/login'); }} />
    </Screen>
  );
}
