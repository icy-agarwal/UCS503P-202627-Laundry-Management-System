import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Chips, Link, Mu, Pill, Row, Screen, Table, T } from '../../../components/ui';
import { PageHead } from '../../../components/AdminBits';
import { complaintTone } from '../../../constants/domain';
import { useApi } from '../../../hooks/useApi';
import { fmtWhen } from '../../../lib/format';

const F = ['All', 'Escalated', 'Open', 'In progress', 'Resolved'] as const;
export default function AdminComplaints() {
  const r = useRouter();
  const [f, setF] = useState<(typeof F)[number]>('All');
  const q = useApi(() => api.listComplaints()), cfg = useApi(() => api.config());
  const hn = (id: string) => cfg.data?.hostels.find((h) => h.id === id)?.name ?? id;
  return (
    <Screen wide onRefresh={q.reload}>
      <PageHead title="Complaints" sub="Every complaint from every hostel. Escalated ones need an admin decision." />
      <Chips options={F} value={f} onChange={setF} />
      <Async q={q}>{(all) => {
        const closed = (s: string) => ['Resolved', 'Closed'].includes(s);
        const l = all.filter((c) => f === 'All' || (f === 'Escalated' && c.escalated && !closed(c.status)) || (f === 'Open' && c.status === 'Open') || (f === 'In progress' && ['Under review', 'Investigating'].includes(c.status)) || (f === 'Resolved' && closed(c.status)));
        return <Table cols={[{ h: 'Complaint', min: 90 }, { h: 'Batch', min: 90 }, { h: 'Student', min: 200 }, { h: 'Type', min: 140 }, { h: 'Status', min: 200 }, { h: 'Filed', min: 110 }]} empty="No complaints match this filter."
          rows={l.map((c) => [
            <Link key="a" label={c.id} onPress={() => r.push(`/admin/complaints/${c.id}`)} />, c.batchId,
            <View key="b"><T size={14}>{c.studentName}</T><Mu style={{ fontSize: 12 }}>{c.studentId} · {hn(c.hostelId)}</Mu></View>, c.type,
            <Row key="c" start wrap gap={6}><Pill text={c.status} tone={complaintTone(c.status)} />{c.escalated && !closed(c.status) ? <Pill text="Escalated" tone="am" /> : null}</Row>,
            fmtWhen(c.filedAt),
          ])} />;
      }}</Async>
    </Screen>
  );
}
