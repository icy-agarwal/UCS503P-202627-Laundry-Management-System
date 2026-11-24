import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import type { Batch, Condition } from '../../../api/types';
import { Async, Btn, Card, Chip, Chips, Field, H2, Header, Label, Mu, Pill, Row, Screen, Stepper, T, useRun } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { useTheme } from '../../../hooks/useTheme';
import { pcs } from '../../../lib/format';

function Form({ b, categories, conditions }: { b: Batch; categories: string[]; conditions: string[] }) {
  const r = useRouter(), th = useTheme(), run = useRun();
  const [c, setC] = useState<Record<string, number>>({ ...b.items });
  const [conds, setConds] = useState<Condition[]>(b.conditions);
  const [remark, setRemark] = useState(b.remark);
  const [sc, setSc] = useState(Object.keys(b.items)[0] ?? ''), [sk, setSk] = useState(conditions[0] ?? '');
  const [rej, setRej] = useState(false), [busy, setBusy] = useState(false);
  const keys = Object.keys(c), total = pcs(c);
  const changed = keys.filter((k) => c[k] !== (b.original[k] ?? 0));
  const done = (m: string) => async (fn: () => Promise<unknown>) => { setBusy(true); const ok = await run(fn, m); setBusy(false); if (ok) r.back(); };

  return <>
    <Card><Row><View><H2>{b.rid}</H2><Mu>{b.studentId} · {b.studentName}</Mu></View><Pill text={`Student entered ${pcs(b.original)}`} tone="bl" /></Row>
      {b.remark ? <Mu style={{ marginTop: 10 }}>Student note: “{b.remark}”</Mu> : null}</Card>
    <View style={{ gap: 8 }}>
      <Label>Physical count</Label><Mu>Count what is on the counter and correct the numbers.</Mu>
      {keys.map((k) => {
        const o = b.original[k] ?? 0, ch = c[k] !== o;
        return <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: ch ? 'transparent' : th.bd, backgroundColor: ch ? th.amb : th.card }}>
          <View style={{ flex: 1 }}><T w="b">{k}</T><T size={12} color={ch ? th.amt : th.mu}>{o ? `Student entered ${o}` : 'Not in student’s list'}</T></View>
          <Stepper value={c[k]} onChange={(n) => setC((s) => ({ ...s, [k]: n }))} />
        </View>;
      })}
    </View>
    {categories.some((k) => c[k] === undefined) ? <View style={{ gap: 8 }}><Label>Add a category</Label><Chips scroll options={categories.filter((k) => c[k] === undefined).map((k) => ({ v: k, l: `+ ${k}` }))} onChange={(k) => setC((s) => ({ ...s, [k]: 1 }))} /></View> : null}
    {changed.length ? <Card tone="warn"><T w="x" size={12} color={th.amt}>CHANGED FROM STUDENT’S ENTRY</T><T w="b" color={th.amt} style={{ marginTop: 6 }}>{changed.map((k) => `${k} ${b.original[k] ?? 0} → ${c[k]}`).join(' · ')}</T><Mu>The original entry is kept in the history.</Mu></Card> : null}
    <Card style={{ gap: 10 }}>
      <Label>Existing condition</Label>
      <Chips scroll options={keys} value={sc} onChange={setSc} />
      <Chips scroll options={conditions} value={sk} onChange={setSk} />
      <Btn small label="Add condition" onPress={() => { if (sc && sk && !conds.some((x) => x.c === sc && x.k === sk)) setConds((s) => [...s, { c: sc, k: sk }]); }} />
      {conds.length ? <Row wrap start gap={8}>{conds.map((x, i) => <Chip key={i} on label={`${x.c} · ${x.k} ✕`} onPress={() => setConds((s) => s.filter((_, j) => j !== i))} />)}</Row> : null}
    </Card>
    <Field label="Remarks (optional)" value={remark} onChangeText={setRemark} multiline placeholder="e.g. button missing on one shirt" />
    {rej ? (
      <Card tone="bad" style={{ gap: 10 }}>
        <T w="x" size={12} color={th.rdt}>REJECT THIS REQUEST?</T>
        <Row wrap start gap={8}>{['Clothes not brought', 'Duplicate request', 'Other'].map((x) => <Chip key={x} label={x} onPress={() => done(`${b.rid} rejected. Student notified`)(() => api.rejectRequest(b.rid, x))} />)}</Row>
        <Btn small label="Keep request" onPress={() => setRej(false)} />
      </Card>
    ) : <>
      <Btn kind="primary" label={`Approve · ${total} pieces`} disabled={!total} loading={busy} onPress={() => done(`${b.rid} verified. Student notified`)(() => api.verifyRequest(b.rid, { items: c, conditions: conds, remark }))} />
      <Btn kind="danger" label="Reject request" onPress={() => setRej(true)} />
    </>}
  </>;
}

export default function Verify() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useApi(() => api.getBatch(id), [id]);
  const cfg = useApi(() => api.config());
  return (
    <Screen>
      <Header title="Verify laundry" fallback="/staff/queues" />
      <Async q={q}>{(b) => <Async q={cfg}>{(c) => b.status === 'WAITING_FOR_VERIFICATION'
        ? <Form b={b} categories={c.categories.filter((x) => x.on).map((x) => x.name)} conditions={c.conditions} />
        : <Card><Mu>This request has already been handled.</Mu></Card>}</Async>}</Async>
    </Screen>
  );
}
