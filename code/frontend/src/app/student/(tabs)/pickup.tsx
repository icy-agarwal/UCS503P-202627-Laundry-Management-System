import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../../api';
import type { Batch } from '../../../api/types';
import { Async, Card, Empty, H1, H2, Mu, Pill, Row, Screen, T } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { did } from '../../../lib/format';

function PickupCard({ b }: { b: Batch }) {
  const q = useApi(() => api.getPickup(b.rid), [b.rid]);
  return (
    <Card style={{ alignItems: 'center', gap: 12 }}>
      <Row start gap={10}><H2>Batch {did(b)}</H2><Pill text="Ready for Pickup" tone="gr" /></Row>
      <Async q={q}>{(p) => p ? (
        <>
          <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}><QRCode value={`hlp:${p.token}`} size={210} color="#111" backgroundColor="#fff" /></View>
          <Mu>Backup code</Mu>
          <T w="x" size={28} style={{ letterSpacing: 6 }}>{p.code.slice(0, 3)} {p.code.slice(3)}</T>
        </>
      ) : <Mu>The pickup code isn’t available yet. Pull down to refresh.</Mu>}</Async>
    </Card>
  );
}

export default function Pickup() {
  const q = useApi(() => api.listBatches());
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <H1>Pickup QR</H1>
      <Mu>Show this to staff at the counter. It works only once.</Mu>
      <Async q={q}>{(all) => {
        const ready = all.filter((b) => b.status === 'READY_FOR_PICKUP'), last = all.find((b) => b.status === 'COLLECTED');
        if (!ready.length) return <Empty text={last ? `Batch ${did(last)} was collected. Its token is used and can’t be reused.` : 'No laundry is ready yet. Your QR appears here once staff mark a batch Ready for Pickup.'} />;
        return <>{ready.map((b) => <PickupCard key={b.rid} b={b} />)}<Mu>Single-use token. Once staff confirm collection, the order becomes Collected and the code stops working.</Mu></>;
      }}</Async>
    </Screen>
  );
}
