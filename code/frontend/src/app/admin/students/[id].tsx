import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Card, Chips, ConfirmBtn, H2, Label, Mu, Pill, Row, Screen, Table, useRun } from '../../../components/ui';
import { Grid, PageHead } from '../../../components/AdminBits';
import { useApi } from '../../../hooks/useApi';
import { curEnrollment } from '../../../lib/format';

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter(), run = useRun();
  const q = useApi(() => api.getStudent(id), [id]), cfg = useApi(() => api.config()), batches = useApi(() => api.listBatches());
  const [nh, setNh] = useState<string>();
  return (
    <Screen wide>
      <Btn small label="‹ Back to students" style={{ alignSelf: 'flex-start' }} onPress={() => (r.canGoBack() ? r.back() : r.replace('/admin/students'))} />
      <Async q={q}>{(s) => <Async q={cfg}>{(c) => {
        const hn = (h: string) => c.hostels.find((x) => x.id === h)?.name ?? h, sn = (x: string) => c.semesters.find((m) => m.id === x)?.name ?? x;
        const e = curEnrollment(s), others = c.hostels.filter((h) => h.id !== e?.hostelId), sel = nh ?? others[0]?.id;
        const mine = (batches.data ?? []).filter((b) => b.studentId === s.id).length;
        return <>
          <PageHead title={s.name} sub={`${s.id} · ${s.email} · +91 ${s.phone}`} right={<Pill text={s.active ? 'Active' : 'Inactive'} tone={s.active ? 'gr' : 'gy'} />} />
          <Grid min={320}>
            <View style={{ gap: 14 }}>
              <Card style={{ gap: 12 }}><H2>Hostel and semester history</H2>
                <Table cols={[{ h: 'Semester', min: 130 }, { h: 'Hostel', min: 140 }, { h: 'Status', min: 130 }]} rows={s.enrollments.slice().reverse().map((x) => [sn(x.semesterId), hn(x.hostelId), <Pill key="p" text={x.status} tone={x.status === 'Active' ? 'gr' : x.status === 'Pending renewal' ? 'am' : 'gy'} />])} /></Card>
              <Card><Row><View><H2>Laundry</H2><Mu>{mine} batches on record</Mu></View><Btn label="View in audit log" onPress={() => r.navigate({ pathname: '/admin/audit', params: { q: s.id } })} /></Row></Card>
            </View>
            <View style={{ gap: 14 }}>
              {s.active ? <>
                <Card style={{ gap: 12 }}><H2>Change hostel</H2><Mu>Ends the current enrollment and starts a new one in this semester. Past laundry stays with the old hostel.</Mu>
                  <Label>New hostel</Label><Chips options={others.map((h) => ({ v: h.id, l: h.name }))} value={sel} onChange={setNh} />
                  {sel ? <ConfirmBtn kind="default" label="Change hostel" message={`Move ${s.name} to ${hn(sel)}?`} onConfirm={async () => { await run(() => api.changeHostel(s.id, sel), `${s.name} moved to ${hn(sel)}`); }} /> : null}</Card>
                <Card style={{ gap: 12 }}><H2>Account</H2><Mu>Deactivate a student who has left college. Their history is kept.</Mu>
                  <ConfirmBtn label="Deactivate student" message={`Deactivate ${s.name}? They will no longer be able to sign in.`} onConfirm={async () => { await run(() => api.setStudentActive(s.id, false), `${s.name} deactivated`); }} /></Card>
              </> : <Card style={{ gap: 12 }}><H2>Account</H2><Mu>This student is inactive and cannot sign in.</Mu>
                <ConfirmBtn kind="primary" label="Reactivate student" message={`Reactivate ${s.name}?`} onConfirm={async () => { await run(() => api.setStudentActive(s.id, true), `${s.name} reactivated`); }} /></Card>}
            </View>
          </Grid>
        </>;
      }}</Async>}</Async>
    </Screen>
  );
}
