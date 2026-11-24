import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../api';
import { Async, Btn, Chip, Chips, Empty, H1, Row, Screen, useRun } from '../../components/ui';
import { BatchCard } from '../../components/StaffBits';
import { QUEUES } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';

export default function Queues() {
  const { q: qp } = useLocalSearchParams<{ q?: string }>();
  const [key, setKey] = useState(qp ?? 'verify');
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const run = useRun();
  const q = useApi(() => api.listBatches());
  useEffect(() => { if (qp) setKey(qp); }, [qp]);
  const def = QUEUES.find((x) => x.key === key)!;
  return (
    <Screen onRefresh={q.reload} refreshing={q.loading && !!q.data}>
      <H1>Queues</H1>
      <Async q={q}>{(all) => {
        const l = all.filter((b) => def.statuses.includes(b.status));
        const ids = Object.keys(sel).filter((k) => sel[k] && l.some((b) => b.rid === k));
        return <>
          <Chips scroll options={QUEUES.map((x) => ({ v: x.key, l: `${x.label} · ${all.filter((b) => x.statuses.includes(b.status)).length}` }))} value={key} onChange={(k) => { setKey(k); setSel({}); }} />
          {key === 'wash' && l.length ? (
            <Row>
              <Chip label={ids.length === l.length ? 'Clear selection' : 'Select all'} onPress={() => setSel(ids.length === l.length ? {} : Object.fromEntries(l.map((b) => [b.rid, true])))} />
              <Btn kind="primary" small label={`Mark ${ids.length || ''} returned`} disabled={!ids.length} onPress={async () => { if (await run(() => api.transition(ids, 'RETURNED'), `${ids.length} batches marked returned`)) setSel({}); }} />
            </Row>
          ) : null}
          {l.map((b) => <BatchCard key={b.rid} b={b} selected={!!sel[b.rid]} onSelect={key === 'wash' ? () => setSel((s) => ({ ...s, [b.rid]: !s[b.rid] })) : undefined} />)}
          {!l.length ? <Empty text={`Nothing in ${def.label.toLowerCase()} right now.`} /> : null}
        </>;
      }}</Async>
    </Screen>
  );
}
