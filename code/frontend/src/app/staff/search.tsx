import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Btn, Chips, Empty, Field, H1, Row, Screen } from '../../components/ui';
import { BatchCard } from '../../components/StaffBits';
import { useApi } from '../../hooks/useApi';

const F = ['All', 'Active', 'Collected', 'Complaints'] as const;
export default function Search() {
  const [text, setText] = useState(''), [term, setTerm] = useState(''), [f, setF] = useState<(typeof F)[number]>('All');
  const q = useApi(() => api.listBatches({ search: term }), [term]);
  return (
    <Screen>
      <H1>Search &amp; History</H1>
      <Row><View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder="Student ID, name or batch ID" onSubmitEditing={() => setTerm(text)} returnKeyType="search" /></View><Btn kind="primary" label="Search" onPress={() => setTerm(text)} /></Row>
      <Chips scroll options={F} value={f} onChange={setF} />
      <Async q={q}>{(all) => {
        const l = all.filter((b) => f === 'All' || (f === 'Active' && !['COLLECTED', 'CANCELLED'].includes(b.status)) || (f === 'Collected' && b.status === 'COLLECTED') || (f === 'Complaints' && b.complaintId));
        return <>{l.map((b) => <BatchCard key={b.rid} b={b} />)}{!l.length ? <Empty text="No laundry matches that search." /> : null}</>;
      }}</Async>
    </Screen>
  );
}
