import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api';
import { Async, Card, Chips, Empty, H1, H2, Mu, Pill, Row, Screen } from '../../components/ui';
import { complaintTone } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';

const F = ['All', 'Open', 'In progress', 'Resolved'] as const;
export default function StaffComplaints() {
  const r = useRouter();
  const q = useApi(() => api.listComplaints());
  const [f, setF] = useState<(typeof F)[number]>('All');
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <H1>Complaints</H1>
      <Chips scroll options={F} value={f} onChange={setF} />
      <Async q={q}>{(all) => {
        const l = all.filter((c) => f === 'All' || (f === 'Open' && c.status === 'Open') || (f === 'In progress' && ['Under review', 'Investigating'].includes(c.status)) || (f === 'Resolved' && ['Resolved', 'Closed'].includes(c.status)));
        return <>{l.map((c) => <Pressable key={c.id} onPress={() => r.push(`/staff/complaint/${c.id}`)}><Card style={{ gap: 6 }}><Row><H2>{c.id} · Batch {c.batchId}</H2><Pill text={c.status} tone={complaintTone(c.status)} /></Row><Mu>{c.studentName} · {c.type}: {c.description}</Mu></Card></Pressable>)}{!l.length ? <Empty text="No complaints here." /> : null}</>;
      }}</Async>
    </Screen>
  );
}
