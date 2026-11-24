import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api';
import { Async, Avatar, Btn, Card, Empty, H1, H2, Mu, Row, Screen, T } from '../../components/ui';
import { QUEUES } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { did, fmtWhen, initials, pcs } from '../../lib/format';

export default function StaffHome() {
  const { me } = useAuth();
  const r = useRouter();
  const q = useApi(() => api.listBatches());
  const cm = useApi(() => api.listComplaints());
  const cfg = useApi(() => api.config());
  const hostel = cfg.data?.hostels.find((h) => h.id === me!.hostelId);
  const open = (cm.data ?? []).filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const tile = (num: number, label: string, go: () => void) => (
    <Pressable key={label} onPress={go} style={{ width: '48%', flexGrow: 1 }}><Card style={{ gap: 8 }}><T w="x" size={30}>{num}</T><T w="b" size={13} mu>{label}</T></Card></Pressable>
  );
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <Row>
        <View><Mu>{hostel?.name ?? 'Laundry counter'} · Laundry counter</Mu><H1>Hi, {me!.name.split(' ')[0]}</H1></View>
        <Avatar size={44} text={initials(me!.name)} onPress={() => r.push('/staff/me')} />
      </Row>
      <Async q={q}>{(all) => <>
        <Row wrap style={{ gap: 12 }}>
          {QUEUES.map((k) => tile(all.filter((b) => k.statuses.includes(b.status)).length, k.tile, () => r.navigate({ pathname: '/staff/queues', params: { q: k.key } })))}
          {tile(open, 'Open complaints', () => r.navigate('/staff/complaints'))}
        </Row>
        <Row><Btn flex kind="primary" icon="qr" label="Scan pickup QR" onPress={() => r.navigate('/staff/scan')} /><Btn flex icon="search" label="Search" onPress={() => r.navigate('/staff/search')} /></Row>
        <Row><H2>Next to verify</H2><Btn small label="View queue" onPress={() => r.navigate({ pathname: '/staff/queues', params: { q: 'verify' } })} /></Row>
        {all.filter((b) => b.status === 'WAITING_FOR_VERIFICATION').slice(0, 2).map((b) => (
          <Card key={b.rid}><Row><View style={{ flex: 1 }}><T w="b">{did(b)} · {b.studentId}</T><Mu>{pcs(b.items)} pieces · {fmtWhen(b.submittedAt)}</Mu></View><Btn kind="primary" small label="Verify" onPress={() => r.push(`/staff/verify/${b.rid}`)} /></Row></Card>
        ))}
        {!all.some((b) => b.status === 'WAITING_FOR_VERIFICATION') ? <Empty text="No requests waiting for verification." /> : null}
      </>}</Async>
    </Screen>
  );
}
