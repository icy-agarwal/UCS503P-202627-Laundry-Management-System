import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Chips, Field, Link, Mu, Pill, Row, Screen, Table, T } from '../../../components/ui';
import { PageHead } from '../../../components/AdminBits';
import { useApi } from '../../../hooks/useApi';
import { curEnrollment } from '../../../lib/format';

const F = ['All', 'Active', 'Inactive'] as const;
export default function Students() {
  const r = useRouter();
  const [text, setText] = useState(''), [term, setTerm] = useState(''), [f, setF] = useState<(typeof F)[number]>('All');
  const q = useApi(() => api.listStudents(term), [term]), cfg = useApi(() => api.config());
  const hn = (id: string) => cfg.data?.hostels.find((h) => h.id === id)?.name ?? id;
  return (
    <Screen wide onRefresh={q.reload}>
      <PageHead title="Students" sub={q.data ? `${q.data.length} registered` : undefined} />
      <Row start wrap><View style={{ width: 360, maxWidth: '100%' }}><Field value={text} onChangeText={setText} placeholder="Search roll number, name or phone" onSubmitEditing={() => setTerm(text)} returnKeyType="search" /></View><Btn kind="primary" label="Search" onPress={() => setTerm(text)} /></Row>
      <Chips options={F} value={f} onChange={setF} />
      <Async q={q}>{(all) => {
        const l = all.filter((s) => f === 'All' || (f === 'Active') === s.active);
        return <Table cols={[{ h: 'Roll number', min: 120 }, { h: 'Student', min: 220 }, { h: 'Current hostel', min: 170 }, { h: 'Status', min: 190 }]} empty="No student matches that search."
          rows={l.map((s) => { const e = curEnrollment(s); return [
            <Link key="a" label={s.id} onPress={() => r.push(`/admin/students/${s.id}`)} />,
            <View key="b"><T size={14}>{s.name}</T><Mu style={{ fontSize: 12 }}>{s.email}</Mu></View>,
            e ? hn(e.hostelId) : '—',
            <Row key="c" start wrap gap={6}>{e?.status === 'Pending renewal' ? <Pill text="Pending renewal" tone="am" /> : null}<Pill text={s.active ? 'Active' : 'Inactive'} tone={s.active ? 'gr' : 'gy'} /></Row>,
          ]; })} />;
      }}</Async>
    </Screen>
  );
}
