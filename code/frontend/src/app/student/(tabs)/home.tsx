import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Avatar, Banner, Btn, Card, Empty, H1, H2, IconButton, Mu, Pill, Row, Screen, Segments, T, Caption, useRun } from '../../../components/ui';
import { DaysStrip } from '../../../components/Bits';
import { counterSlot, useDemoClock } from '../../../constants/schedule';
import { STEPS, stepOf } from '../../../constants/domain';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { did, fmtExpected, initials, pcs } from '../../../lib/format';

export default function Home() {
  const { me, refresh } = useAuth();
  const r = useRouter(), th = useTheme(), run = useRun(), clock = useDemoClock();
  const batches = useApi(() => api.listBatches());
  const notifs = useApi(() => api.listNotifications());
  const cfg = useApi(() => api.config());
  const p = me!.profile!;
  const hostel = cfg.data?.hostels.find((h) => h.id === p.hostelId);
  const slot = counterSlot(hostel, clock, cfg.data?.enforceCounterHours !== false);
  const active = batches.data?.find((b) => b.status !== 'COLLECTED' && b.status !== 'CANCELLED');
  const unread = notifs.data?.filter((n) => !n.read).length ?? 0;
  const pending = me!.enrollment?.status === 'Pending renewal';
  const sem = cfg.data?.semesters.find((s) => s.current)?.name;
  const reload = () => { batches.reload(); notifs.reload(); cfg.reload(); };

  return (
    <Screen onRefresh={reload} refreshing={batches.loading && !!batches.data}>
      <Row>
        <Row start gap={12} style={{ flex: 1 }}>
          <Avatar text={initials(p.name)} />
          <View style={{ flex: 1 }}><Mu numberOfLines={1}>{hostel?.name ?? '—'} · Room {p.room}</Mu><H1 size={22}>Hi, {p.name.split(' ')[0]}</H1></View>
        </Row>
        <IconButton name="bell" label={`Notifications, ${unread} unread`} badge={unread} onPress={() => r.push('/student/notifications')} />
      </Row>

      {pending ? (
        <Card tone="warn" style={{ gap: 10 }}>
          <T w="x" color={th.amt}>Renew for {sem ?? 'the new semester'}</T>
          <T size={13} color={th.amt}>Confirm you are staying in {hostel?.name} to keep submitting laundry. To move hostels, edit your profile instead.</T>
          <Row start wrap><Btn kind="primary" small label="Renew" onPress={async () => { if (await run(() => api.renewEnrollment(), 'Renewed')) await refresh(); }} /><Btn small label="Change hostel" onPress={() => r.push('/student/setup')} /></Row>
        </Card>
      ) : null}

      <Banner tone={slot.tone} title={slot.title} sub={slot.sub} icon={slot.open ? 'ok' : slot.tone === 'bl' ? 'bag' : 'lock'} />

      <Async q={batches}>{() => active ? (
        <View style={{ backgroundColor: th.hero1, borderRadius: 18, padding: 16, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <Row>
            <View><Caption color="rgba(255,255,255,0.82)">Active laundry</Caption><T w="x" size={24} color="#fff">Batch {did(active)}</T></View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}><T w="b" size={12} color="#fff">{STEPS[stepOf(active.status)]}</T></View>
          </Row>
          <View style={{ marginVertical: 14, gap: 6 }}>
            <Segments n={6} done={stepOf(active.status)} active={stepOf(active.status)} onHero />
            <Row><T size={13} color="rgba(255,255,255,0.82)">Submitted</T><T size={13} color="rgba(255,255,255,0.82)">Collected</T></Row>
          </View>
          <Row style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)', paddingTop: 12 }}>
            <T size={13} color="rgba(255,255,255,0.9)" style={{ flex: 1 }}>{pcs(active.items)} pieces · Expected {fmtExpected(active.expectedOn)}</T>
            <Btn small label="Details" onPress={() => r.push(`/student/batch/${active.rid}`)} />
          </Row>
        </View>
      ) : <Empty text="No active laundry. Submit a request on your laundry days." />}</Async>

      <Row><Btn flex kind="primary" icon="submit" label="Submit Laundry" onPress={() => r.navigate('/student/submit')} /><Btn flex icon="qr" label="Pickup QR" onPress={() => r.navigate('/student/pickup')} /></Row>

      {hostel ? (
        <Card style={{ gap: 10 }}>
          <Row><H2>{hostel.name} schedule</H2></Row>
          <DaysStrip days={hostel.days} />
          <Mu style={{ fontSize: 12 }}>Highlighted days: collection &amp; pickup · 12:30–3 · 4–7 PM</Mu>
        </Card>
      ) : null}

      <Row><H2>Notifications</H2><Btn small label="View all" onPress={() => r.push('/student/notifications')} /></Row>
      <Async q={notifs}>{(l) => <>{l.slice(0, 2).map((n) => <Card key={n.id}><T w="b">{n.title}</T><Mu>{n.body}</Mu></Card>)}{!l.length ? <Empty text="Nothing yet." /> : null}</>}</Async>

      <Btn kind="danger" label="Report a problem" onPress={() => r.push('/student/complaint-new')} />
    </Screen>
  );
}
