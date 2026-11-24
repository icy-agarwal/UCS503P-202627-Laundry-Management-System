import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../api';
import { Async, Chips, Link, Mu, Pill, Screen, Table, T } from '../../components/ui';
import { PageHead } from '../../components/AdminBits';
import { StaffPill } from '../../components/Bits';
import { useApi } from '../../hooks/useApi';
import { did, isToday, pcs, whenDays } from '../../lib/format';

const F = ['All', 'Today', 'In progress', 'Delayed', 'Collected'] as const;
type Fl = (typeof F)[number];

export default function Batches() {
  const { f: fp } = useLocalSearchParams<{ f?: string }>();
  const [f, setF] = useState<Fl>((F as readonly string[]).includes(fp ?? '') ? (fp as Fl) : 'All');
  const r = useRouter();
  const q = useApi(() => api.listBatches()), cfg = useApi(() => api.config());
  const hn = (id: string) => cfg.data?.hostels.find((h) => h.id === id)?.name ?? id;
  return (
    <Screen wide onRefresh={q.reload}>
      <Async q={q}>{(all) => {
        const l = all.filter((b) => f === 'All' || (f === 'Today' && isToday(b.submittedAt)) || (f === 'In progress' && !['COLLECTED', 'CANCELLED'].includes(b.status)) || (f === 'Delayed' && b.late && b.status === 'IN_LAUNDRY') || (f === 'Collected' && b.status === 'COLLECTED'));
        return <>
          <PageHead title="Batches" sub={`${l.length} batches${f === 'All' ? '' : ` · ${f.toLowerCase()}`}`} />
          <Chips options={F} value={f} onChange={setF} />
          <Table cols={[{ h: 'Batch', min: 100 }, { h: 'Student', min: 170 }, { h: 'Hostel', min: 150 }, { h: 'Pieces', min: 80 }, { h: 'Status', min: 190 }, { h: 'Submitted', min: 110 }]}
            empty="No batches match this filter."
            rows={l.map((b) => [
              <Link key="a" label={did(b)} onPress={() => r.navigate({ pathname: '/admin/audit', params: { q: did(b) } })} />,
              <View key="b"><T size={14}>{b.studentName}</T><Mu style={{ fontSize: 12 }}>{b.studentId}</Mu></View>,
              hn(b.hostelId), String(pcs(b.items)),
              <View key="c" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}><StaffPill status={b.status} />{b.late && b.status === 'IN_LAUNDRY' ? <Pill text="Delayed" tone="rd" /> : null}</View>,
              whenDays(b.submittedAt),
            ])} />
        </>;
      }}</Async>
    </Screen>
  );
}
