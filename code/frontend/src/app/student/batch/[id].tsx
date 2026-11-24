import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Card, H1, H2, Header, Mu, Row, Screen, T, ItemIcon } from '../../../components/ui';
import { StudentPill } from '../../../components/Bits';
import { STEPS, stepOf } from '../../../constants/domain';
import { useApi } from '../../../hooks/useApi';
import { useTheme } from '../../../hooks/useTheme';
import { did, fmtExpected, fmtShort, pcs } from '../../../lib/format';

export default function BatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter(), th = useTheme();
  const q = useApi(() => api.getBatch(id), [id]);
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <Header title="Request details" fallback="/student/history" />
      <Async q={q}>{(b) => {
        const step = stepOf(b.status), done = b.status === 'COLLECTED';
        return <>
          <Row top>
            <View style={{ flex: 1 }}><H1 size={24}>Batch {did(b)}</H1><Mu>Submitted {fmtShort(b.submittedAt)}{b.status === 'COLLECTED' ? '' : ` · Expected ${fmtExpected(b.expectedOn)}`}</Mu></View>
            <StudentPill status={b.status} />
          </Row>
          {b.status === 'CANCELLED' ? <Card tone="bad"><T w="b" color={th.rdt}>This request was rejected at the counter. See your notifications for the reason.</T></Card> : (
            <Card style={{ gap: 4 }}>
              <H2 style={{ marginBottom: 6 }}>Status</H2>
              {STEPS.map((s, i) => (
                <Row key={s} start gap={12} style={{ paddingVertical: 6 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < step || done ? th.pr : i === step ? th.amber : th.off }} />
                  <T w={i === step ? 'x' : i < step ? 'b' : 'm'} color={i > step ? th.mu : th.tx}>{s}</T>
                </Row>
              ))}
            </Card>
          )}
          <Card style={{ gap: 10 }}>
            <H2>Items · {pcs(b.items)} pieces</H2>
            <Row wrap start gap={14}>
              {Object.entries(b.items).map(([k, v]) => <Row key={k} start gap={10} style={{ width: '46%' }}><ItemIcon name={k} size={40} glyph={22} /><T w="b" size={13} style={{ flexShrink: 1 }}>{k} ×{v}</T></Row>)}
            </Row>
            {b.conditions.length ? <Mu>Noted by staff: {b.conditions.map((c) => `${c.c} (${c.k.toLowerCase()})`).join(', ')}</Mu> : null}
          </Card>
          {b.status === 'READY_FOR_PICKUP' ? <Btn kind="primary" icon="qr" label="Show pickup QR" onPress={() => r.navigate('/student/pickup')} /> : null}
          {b.complaintId ? <Btn kind="danger" label="View complaint" onPress={() => r.push('/student/complaints')} /> : <Btn kind="danger" label="Report an issue" onPress={() => r.push({ pathname: '/student/complaint-new', params: { batchId: b.rid } })} />}
        </>;
      }}</Async>
    </Screen>
  );
}
