import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../api';
import { Async, Btn, Chips, Field, Mu, Pill, Row, Screen, Table, T } from '../../components/ui';
import { PageHead } from '../../components/AdminBits';
import { useApi } from '../../hooks/useApi';
import { fmtWhen } from '../../lib/format';

const R = ['All', 'Student', 'Staff', 'Admin'] as const;
export default function Audit() {
  const { q: qp = '' } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(qp), [term, setTerm] = useState(qp), [role, setRole] = useState<(typeof R)[number]>('All');
  useEffect(() => { setText(qp); setTerm(qp); }, [qp]);
  const q = useApi(() => api.listAudit({ search: term, role }), [term, role]);
  return (
    <Screen wide onRefresh={q.reload}>
      <PageHead title="Audit log" sub="Every important change is kept, so a dispute can be traced from submission to collection." />
      <Row start wrap><View style={{ width: 360, maxWidth: '100%' }}><Field value={text} onChangeText={setText} placeholder="Search batch ID, person or action" onSubmitEditing={() => setTerm(text)} returnKeyType="search" /></View><Btn kind="primary" label="Search" onPress={() => setTerm(text)} /></Row>
      <Chips options={R} value={role} onChange={setRole} />
      <Async q={q}>{(l) => <Table cols={[{ h: 'When', min: 130 }, { h: 'Batch', min: 90 }, { h: 'Action', min: 280, flex: 2 }, { h: 'Change', min: 220 }, { h: 'By', min: 160 }]} empty="No entries match."
        rows={l.map((e) => [fmtWhen(e.at), e.batchId || 'n/a', e.action,
          e.from || e.to ? <T key="c" size={14}><T mu size={14}>{e.from || 'n/a'}</T> → <T w="b" size={14}>{e.to || 'n/a'}</T></T> : <Mu key="c">n/a</Mu>,
          <View key="d" style={{ gap: 4 }}><T size={14}>{e.who}</T><Pill text={e.role[0].toUpperCase() + e.role.slice(1)} tone={e.role === 'admin' ? 'bl' : e.role === 'staff' ? 'am' : 'gy'} /></View>])} />}</Async>
    </Screen>
  );
}
