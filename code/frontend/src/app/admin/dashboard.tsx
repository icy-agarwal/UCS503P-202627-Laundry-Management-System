import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api';
import { Async, Bars, Btn, Card, H2, Link, Mu, Pill, Row, Screen, T } from '../../components/ui';
import { Grid, PageHead } from '../../components/AdminBits';
import { complaintTone } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { fmtWhen, isToday } from '../../lib/format';

const STAGES: [string, string[]][] = [
  ['Waiting for verification', ['WAITING_FOR_VERIFICATION']], ['Tagging', ['AWAITING_TAGGING', 'TAGGED']], ['In laundry', ['IN_LAUNDRY']],
  ['Returned', ['RETURNED']], ['Ready for pickup', ['READY_FOR_PICKUP']], ['Collected', ['COLLECTED']],
];

export default function Dashboard() {
  const r = useRouter();
  const b = useApi(() => api.listBatches()), c = useApi(() => api.listComplaints()), a = useApi(() => api.listAudit());
  const tile = (n: number, label: string, go: () => void) => <Pressable onPress={go}><Card style={{ gap: 8 }}><T w="x" size={30}>{n}</T><T w="b" size={13} mu>{label}</T></Card></Pressable>;
  return (
    <Screen wide onRefresh={() => { b.reload(); c.reload(); a.reload(); }}>
      <PageHead title="Dashboard" sub="All hostels · current semester" />
      <Async q={b}>{(bs) => <Async q={c}>{(cs) => {
        const openC = cs.filter((x) => !['Resolved', 'Closed'].includes(x.status)), esc = openC.filter((x) => x.escalated);
        return <>
          <Grid min={150}>
            {tile(bs.filter((x) => isToday(x.submittedAt)).length, 'Received today', () => r.navigate({ pathname: '/admin/batches', params: { f: 'Today' } }))}
            {tile(bs.filter((x) => !['COLLECTED', 'CANCELLED'].includes(x.status)).length, 'In progress', () => r.navigate({ pathname: '/admin/batches', params: { f: 'In progress' } }))}
            {tile(bs.filter((x) => x.late && x.status === 'IN_LAUNDRY').length, 'Delayed', () => r.navigate({ pathname: '/admin/batches', params: { f: 'Delayed' } }))}
            {tile(openC.length, 'Open complaints', () => r.navigate('/admin/complaints'))}
            {tile(esc.length, 'Escalated to you', () => r.navigate('/admin/complaints'))}
          </Grid>
          <Grid min={320}>
            <Card style={{ gap: 12 }}><H2>Batches by stage</H2><Bars items={STAGES.map(([l, s]) => [l, bs.filter((x) => s.includes(x.status)).length])} /></Card>
            <Card style={{ gap: 8 }}>
              <Row><H2>Needs your decision</H2>{esc.length ? <Pill text={`${esc.length} escalated`} tone="am" /> : null}</Row>
              {esc.map((x) => <Row key={x.id} style={{ paddingVertical: 8 }}><View style={{ flex: 1 }}><Link label={`${x.id} · Batch ${x.batchId}`} onPress={() => r.push(`/admin/complaints/${x.id}`)} /><Mu>{x.studentName} · {x.type}</Mu></View><Pill text={x.status} tone={complaintTone(x.status)} /></Row>)}
              {!esc.length ? <Mu>No complaints are waiting on you.</Mu> : null}
            </Card>
          </Grid>
        </>;
      }}</Async>}</Async>
      <Card style={{ gap: 8 }}>
        <Row><H2>Recent activity</H2><Btn small label="Open audit log" onPress={() => r.navigate('/admin/audit')} /></Row>
        <Async q={a}>{(l) => <>{l.slice(0, 6).map((e) => <Row key={e.id} top style={{ paddingVertical: 8 }}><View style={{ flex: 1 }}><T size={14}>{e.action}</T><Mu style={{ fontSize: 12 }}>{e.who} ({e.role}){e.batchId ? ` · ${e.batchId}` : ''}</Mu></View><Mu style={{ fontSize: 12 }}>{fmtWhen(e.at)}</Mu></Row>)}</>}</Async>
      </Card>
    </Screen>
  );
}
