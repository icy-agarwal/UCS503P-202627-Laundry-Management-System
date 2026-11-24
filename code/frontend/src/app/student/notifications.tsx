import React from 'react';
import { api } from '../../api';
import { Async, Btn, Card, Empty, Header, Mu, Pill, Row, Screen, T, useRun } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { fmtWhen } from '../../lib/format';

export default function Notifications() {
  const q = useApi(() => api.listNotifications());
  const run = useRun();
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <Header title="Notifications" fallback="/student/home" />
      <Btn small label="Mark all read" style={{ alignSelf: 'flex-end' }} onPress={() => run(() => api.markAllRead())} />
      <Async q={q}>{(l) => <>{l.map((n) => (
        <Card key={n.id} style={{ gap: 4 }}>
          <Row><T w="b" style={{ flex: 1 }}>{n.title}</T>{n.read ? null : <Pill text="New" tone="bl" />}</Row>
          <Mu>{n.body} · {fmtWhen(n.at)}</Mu>
        </Card>
      ))}{!l.length ? <Empty text="You’re all caught up." /> : null}</>}</Async>
    </Screen>
  );
}
