import React from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Card, Empty, H2, Header, Mu, Pill, Row, Screen } from '../../components/ui';
import { complaintTone } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';

export default function MyComplaints() {
  const q = useApi(() => api.listComplaints());
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <Header title="My complaints" fallback="/student/profile" />
      <Async q={q}>{(l) => <>{l.map((c) => (
        <Card key={c.id} style={{ gap: 6 }}>
          <Row><H2>{c.id} · Batch {c.batchId}</H2><Pill text={c.status} tone={complaintTone(c.status)} /></Row>
          <Mu>{c.type} — {c.description}</Mu>
          {c.notes.length ? <View><Mu style={{ fontSize: 12 }}>Latest update: {c.notes[c.notes.length - 1].a}</Mu></View> : null}
        </Card>
      ))}{!l.length ? <Empty text="No complaints filed." /> : null}</>}</Async>
    </Screen>
  );
}
