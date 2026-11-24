import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Card, H1, H2, Header, Mu, Pill, Row, Screen, T, Timeline, useRun } from '../../../components/ui';
import { Kv, StaffPill } from '../../../components/Bits';
import { NextButton } from '../../../components/StaffBits';
import { useApi } from '../../../hooks/useApi';
import { useTheme } from '../../../hooks/useTheme';
import { did, fmtExpected, fmtWhen, listItems, pcs } from '../../../lib/format';

export default function StaffBatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter(), th = useTheme(), run = useRun();
  const q = useApi(() => api.getBatch(id), [id]);
  const cfg = useApi(() => api.config());
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <Header title="Batch details" fallback="/staff/queues" />
      <Async q={q}>{(b) => {
        const mod = Object.keys({ ...b.original, ...b.items }).filter((k) => (b.original[k] ?? 0) !== (b.items[k] ?? 0));
        return <>
          <Row top><View style={{ flex: 1 }}><H1 size={24}>{did(b)}</H1><Mu>{b.bid ? `Request ${b.rid} · ` : ''}Submitted {fmtWhen(b.submittedAt)}</Mu></View><StaffPill status={b.status} /></Row>
          <Card style={{ paddingVertical: 4 }}>
            <Kv k="Student" v={`${b.studentId} · ${b.studentName}`} />
            <Kv k="Hostel" v={cfg.data?.hostels.find((h) => h.id === b.hostelId)?.name ?? b.hostelId} />
            <Kv k="Expected" v={fmtExpected(b.expectedOn)} last={!b.tokenActive && !b.tokenUsed} />
            {b.tokenActive || b.tokenUsed ? <Kv k="Pickup token" v={b.tokenUsed ? 'Used' : 'Active'} last /> : null}
          </Card>
          <Card style={{ gap: 8 }}>
            <H2>Items · {pcs(b.items)} pieces</H2><Mu>{listItems(b.items)}</Mu>
            {mod.length ? <T w="b" color={th.amt}>Student entered: {mod.map((k) => `${k} ${b.original[k] ?? 0}`).join(', ')}</T> : null}
            {b.conditions.length ? <Row wrap start gap={6}>{b.conditions.map((x, i) => <Pill key={i} text={`${x.c} · ${x.k}`} tone="am" />)}</Row> : null}
            {b.remark ? <Mu>“{b.remark}”</Mu> : null}
          </Card>
          <Card><H2 style={{ marginBottom: 12 }}>History</H2><Timeline entries={b.log.map((e) => ({ a: e.a, sub: `${fmtWhen(e.t)} · ${e.who}` }))} /></Card>
          {b.complaintId ? <Btn kind="danger" label={`View complaint ${b.complaintId}`} onPress={() => r.push(`/staff/complaint/${b.complaintId}`)} /> : null}
          {b.late && b.status === 'IN_LAUNDRY' ? <Btn label="Notify student of delay" onPress={() => run(() => api.sendDelayNotice(b.rid), 'Student notified of the delay')} /> : null}
          <NextButton b={b} />
        </>;
      }}</Async>
    </Screen>
  );
}
