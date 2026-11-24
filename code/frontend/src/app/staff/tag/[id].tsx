import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Card, H2, Header, Mu, Row, Screen, T, useRun } from '../../../components/ui';
import { StaffPill } from '../../../components/Bits';
import { useApi } from '../../../hooks/useApi';
import { useTheme } from '../../../hooks/useTheme';
import { pcs } from '../../../lib/format';

export default function Tag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter(), th = useTheme(), run = useRun();
  const q = useApi(() => api.getBatch(id), [id]);
  return (
    <Screen>
      <Header title="Tag laundry" fallback="/staff/queues" />
      <Async q={q}>{(b) => <>
        <Card><Row><View><H2>{b.studentId} · {b.studentName}</H2><Mu>{pcs(b.items)} pieces verified</Mu></View><StaffPill status={b.status} /></Row></Card>
        {b.bid ? <>
          <View style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: th.tx, borderRadius: 18, paddingVertical: 22, alignItems: 'center', backgroundColor: th.card }}>
            <Mu>Batch ID</Mu><T w="x" size={52} style={{ letterSpacing: 4 }}>{b.bid}</T>
          </View>
          <Card><T w="x" size={12} mu>ON THE BAG AND EACH PIECE</T><Mu style={{ marginTop: 6 }}>Write {b.bid} on the bag tag and on every cloth. Do not write the student’s name or room.</Mu></Card>
          {b.status === 'AWAITING_TAGGING'
            ? <Btn kind="primary" label="Tag applied" onPress={() => run(() => api.transition([b.rid], 'TAGGED'), `${b.bid} tagged`)} />
            : <>
              <Card tone="ok"><T w="b" color={th.grt}>Tag applied. Bag is ready for the wash.</T></Card>
              <Btn kind="primary" label="Send to laundry" onPress={async () => { if (await run(() => api.transition([b.rid], 'IN_LAUNDRY'), `${b.bid} is now in laundry. Student notified`)) r.back(); }} />
            </>}
        </> : <>
          <Card><Mu>This request is verified but has no batch ID yet. Generate one to write on the bag.</Mu></Card>
          <Btn kind="primary" label="Generate batch ID" onPress={() => run(() => api.generateBatchId(b.rid), 'Batch ID generated')} />
        </>}
      </>}</Async>
    </Screen>
  );
}
