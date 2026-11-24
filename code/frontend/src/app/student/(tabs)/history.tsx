import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Card, Chips, Empty, H1, H2, Mu, Pill, Row, Screen } from '../../../components/ui';
import { ItemChips, StudentPill } from '../../../components/Bits';
import { useApi } from '../../../hooks/useApi';
import { useTheme } from '../../../hooks/useTheme';
import { did, fmtExpected, fmtShort } from '../../../lib/format';

const FILTERS = ['All', 'Active', 'Collected', 'Complaints'] as const;

export default function History() {
  const r = useRouter(), th = useTheme();
  const q = useApi(() => api.listBatches());
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <H1>Laundry History</H1>
      <Chips options={FILTERS} value={f} onChange={setF} />
      <Async q={q}>{(all) => {
        const l = all.filter((b) => f === 'All' || (f === 'Active' && !['COLLECTED', 'CANCELLED'].includes(b.status)) || (f === 'Collected' && b.status === 'COLLECTED') || (f === 'Complaints' && b.complaintId));
        return <>{l.map((b) => (
          <Card key={b.rid} style={{ gap: 10 }}>
            <Row top>
              <View style={{ flex: 1 }}><H2>Batch {did(b)}</H2><Mu>Submitted {fmtShort(b.submittedAt)}{b.status === 'COLLECTED' || b.status === 'CANCELLED' ? '' : ` · Expected ${fmtExpected(b.expectedOn)}`}</Mu></View>
              {b.complaintId ? <Pill text="Complaint filed" tone="rd" /> : <StudentPill status={b.status} />}
            </Row>
            <View style={{ borderTopWidth: 1, borderTopColor: th.bd, paddingTop: 10 }}><ItemChips items={b.items} /></View>
            <Row><Btn flex small label="View details" onPress={() => r.push(`/student/batch/${b.rid}`)} />
              {b.complaintId ? <Btn flex small kind="danger" label="View complaint" onPress={() => r.push('/student/complaints')} /> : <Btn flex small label="Report issue" onPress={() => r.push({ pathname: '/student/complaint-new', params: { batchId: b.rid } })} />}</Row>
          </Card>
        ))}{!l.length ? <Empty text="Nothing here yet." /> : null}</>;
      }}</Async>
    </Screen>
  );
}
