import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../api';
import type { Complaint, Role } from '../api/types';
import { Btn, Caption, Card, Err, Field, H1, H2, Mu, Pill, Row, Segments, T, Timeline, useRun } from './ui';
import { COMPLAINT_FLOW, complaintTone } from '../constants/domain';
import { useTheme } from '../hooks/useTheme';
import { fmtWhen } from '../lib/format';

/** Shared by staff and admin: status, notes, and the actions each role may take. */
export function ComplaintBody({ c, role, onTrace }: { c: Complaint; role: Role; onTrace: () => void }) {
  const th = useTheme(), run = useRun();
  const [note, setNote] = useState(''), [err, setErr] = useState('');
  const i = COMPLAINT_FLOW.indexOf(c.status), next = COMPLAINT_FLOW[i + 1];
  const advance = async () => {
    if (i === 2 && !c.notes.length && !note.trim()) return setErr('Add a resolution note first.');
    setErr('');
    if (await run(() => api.advanceComplaint(c.id, note), `${c.id} is now ${next}. Student notified`)) setNote('');
  };
  const actions = i < 3 ? (
    <Card style={{ gap: 10 }}>
      <Field label={`Add a note${i === 2 ? ' (required to resolve)' : ''}`} value={note} onChangeText={setNote} multiline placeholder="What did you check or find?" />
      <Err>{err}</Err>
      <Row wrap start>
        <Btn label="Save note" onPress={async () => { if (!note.trim()) return setErr('Write a note first.'); setErr(''); if (await run(() => api.addComplaintNote(c.id, note), 'Note saved')) setNote(''); }} />
        <Btn kind="primary" label={`Move to ${next}`} onPress={advance} />
        {role === 'staff' && !c.escalated ? <Btn kind="danger" label="Escalate to admin" onPress={() => run(() => api.escalateComplaint(c.id), 'Escalated to admin')} /> : null}
        {role === 'admin' && c.escalated ? <Btn label="Send back to staff" onPress={() => run(() => api.sendBackComplaint(c.id), `${c.id} sent back to staff`)} /> : null}
      </Row>
    </Card>
  ) : i === 3 ? <Btn kind="primary" label="Close complaint" onPress={advance} /> : <Card tone="ok"><T w="b" color={th.grt}>This complaint is closed.</T></Card>;
  return <>
    <Row top>
      <View style={{ flex: 1 }}><H1 size={24}>{c.id}</H1><Mu>{c.studentName} · {c.studentId} · {fmtWhen(c.filedAt)}</Mu></View>
      <Pill text={c.type} tone="rd" />
    </Row>
    <Card style={{ gap: 8 }}><Segments n={5} done={i === 4 ? 5 : i} active={i} /><Row><T w="b">{c.status}</T>{c.escalated && i < 3 ? <Pill text="Escalated" tone="am" /> : null}</Row></Card>
    <Card><Caption>Student’s description</Caption><T style={{ marginTop: 6 }}>{c.description}</T></Card>
    <Btn label={`Trace batch ${c.batchId}`} onPress={onTrace} />
    <Card><H2 style={{ marginBottom: 12 }}>{role === 'admin' ? 'Notes' : 'Staff notes'}</H2>{c.notes.length ? <Timeline entries={c.notes.map((n) => ({ a: n.a, sub: `${fmtWhen(n.t)} · ${n.who}${n.role === 'admin' ? ' (Admin)' : ''}` }))} /> : <Mu>No notes yet.</Mu>}</Card>
    {actions}
  </>;
}
