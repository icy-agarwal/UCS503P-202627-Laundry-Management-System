import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../api';
import type { ComplaintType } from '../../api/types';
import { Async, Btn, Card, Chips, Err, Field, Header, Label, Screen, T, useRun } from '../../components/ui';
import { COMPLAINT_TYPES } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../hooks/useTheme';
import { did } from '../../lib/format';

export default function ComplaintNew() {
  const { batchId } = useLocalSearchParams<{ batchId?: string }>();
  const r = useRouter(), th = useTheme(), run = useRun();
  const batches = useApi(() => api.listBatches());
  const [sel, setSel] = useState<string | undefined>(batchId);
  const [type, setType] = useState<ComplaintType>('Missing'), [desc, setDesc] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!sel) return setErr('Pick a batch first.');
    if (!desc.trim()) return setErr('Please describe the issue.');
    setErr(''); setBusy(true);
    const ok = await run(() => api.createComplaint({ batchId: sel, type, description: desc }), 'Complaint submitted');
    setBusy(false);
    if (ok) r.replace('/student/complaints');
  };

  return (
    <Screen footer={<Btn kind="primary" label="Submit Complaint" onPress={submit} loading={busy} />}>
      <Header title="New complaint" fallback="/student/home" />
      <Async q={batches}>{(l) => {
        const chosen = l.find((b) => b.rid === sel || b.bid === sel);
        return chosen ? <Card tone="info"><T w="b" size={13} color={th.blt}>Linked to Batch {did(chosen)}</T></Card>
          : <><Label>Select a batch</Label><Chips scroll options={l.filter((b) => b.status !== 'CANCELLED').map((b) => ({ v: b.rid, l: did(b) }))} value={sel} onChange={setSel} /></>;
      }}</Async>
      <Label>Issue type</Label>
      <Chips options={COMPLAINT_TYPES} value={type} onChange={setType} />
      <Field label="Describe the issue" value={desc} onChangeText={setDesc} multiline placeholder="What happened? Which item?" style={{ minHeight: 120 }} />
      <Err>{err}</Err>
    </Screen>
  );
}
