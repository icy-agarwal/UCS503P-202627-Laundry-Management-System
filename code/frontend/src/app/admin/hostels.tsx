import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Btn, Card, Chips, ConfirmBtn, Field, H2, Label, Mu, Pill, Screen, Table, T, useRun, Row } from '../../components/ui';
import { Grid, PageHead } from '../../components/AdminBits';
import { SCHEDULE_OPTIONS } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { curEnrollment, fmtDate } from '../../lib/format';

export default function Hostels() {
  const run = useRun();
  const cfg = useApi(() => api.config()), stu = useApi(() => api.listStudents()), staff = useApi(() => api.listStaff());
  const [code, setCode] = useState(''), [name, setName] = useState(''), [grp, setGrp] = useState<'Boys' | 'Girls'>('Boys'), [sch, setSch] = useState(SCHEDULE_OPTIONS[0].label);
  const [sn, setSn] = useState(''), [ss, setSs] = useState(''), [se, setSe] = useState('');
  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  return (
    <Screen wide onRefresh={cfg.reload}>
      <Async q={cfg}>{(c) => {
        const active = (stu.data ?? []).filter((s) => s.active);
        const pending = active.filter((s) => curEnrollment(s)?.status === 'Pending renewal').length;
        const cur = c.semesters.find((s) => s.current);
        return <>
          <PageHead title="Hostels & semesters" sub={`${c.hostels.length} hostels. Collection and delivery days follow the laundry schedule.`} />
          <Table cols={[{ h: 'Hostel', min: 170 }, { h: 'Group', min: 90 }, { h: 'Collection / delivery', min: 190 }, { h: 'Active students', min: 120 }, { h: 'Counter staff', min: 200 }]}
            rows={c.hostels.map((h) => [h.name, <Pill key="g" text={h.group} tone={h.group === 'Girls' ? 'am' : 'bl'} />,
              SCHEDULE_OPTIONS.find((o) => o.days[0] === h.days[0] && o.days[1] === h.days[1])?.label ?? h.days.join(' / '),
              String(active.filter((s) => curEnrollment(s)?.hostelId === h.id).length),
              (staff.data ?? []).filter((m) => m.hostelId === h.id && m.active).map((m) => m.name).join(', ') || 'No staff yet'])} />
          <Card style={{ gap: 12 }}>
            <H2>Add hostel</H2>
            <Field label="Code (short letters, e.g. P)" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="P" autoCapitalize="characters" maxLength={5} />
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Hostel P" />
            <Label>Group</Label><Chips options={['Boys', 'Girls'] as const} value={grp} onChange={setGrp} />
            <Label>Collection / delivery</Label><Chips options={SCHEDULE_OPTIONS.map((o) => o.label)} value={sch} onChange={setSch} />
            <View style={{ alignSelf: 'flex-start' }}><Btn kind="primary" label="Add hostel" onPress={async () => { if (await run(() => api.addHostel({ code, name, group: grp, days: SCHEDULE_OPTIONS.find((o) => o.label === sch)!.days }), `${name} added`)) { setName(''); setCode(''); } }} /></View>
          </Card>
          <H2>Semesters</H2>
          <Grid min={320}>
            <View style={{ gap: 14 }}>
              <Table cols={[{ h: 'Semester', min: 200 }, { h: 'Dates', min: 200 }]} rows={c.semesters.map((m) => [<Row key="a" start gap={8}><T size={14}>{m.name}</T>{m.current ? <Pill text="Current" tone="gr" /> : null}</Row>, m.start ? `${fmtDate(m.start)} to ${fmtDate(m.end)}` : 'Runs for its admission-year batch'])} />
              {!c.semestersReadOnly && pending ? <Card tone="warn" style={{ gap: 10 }}><T w="b">{pending} students are pending renewal for {cur?.name}.</T><Mu>Students renew in the app. You can approve everyone who is staying in the same hostel.</Mu>
                <View style={{ alignSelf: 'flex-start' }}><Btn kind="primary" label="Approve all renewals" onPress={() => run(() => api.approveRenewals(), 'Renewals approved')} /></View></Card> : null}
            </View>
            {c.semestersReadOnly ? <Card style={{ gap: 12 }}><H2>Counter hours rule</H2>
              <Mu>Students can only submit laundry on their hostel’s laundry days between 12:30–3:00 PM and 4:00–7:00 PM. Switch the rule off to demonstrate the app at any time of day.</Mu>
              <Row start wrap><Pill text={c.enforceCounterHours === false ? 'Rule is OFF (demo)' : 'Rule is ON'} tone={c.enforceCounterHours === false ? 'am' : 'gr'} />
                <Btn small label={c.enforceCounterHours === false ? 'Switch rule ON' : 'Switch rule OFF for demo'} onPress={() => run(() => api.setCounterEnforcement(c.enforceCounterHours === false), 'Counter hours rule updated')} /></Row>
            </Card> : <Card style={{ gap: 12 }}>
              <H2>Start a new semester</H2><Mu>The current semester is closed and every active student gets a pending renewal in their present hostel.</Mu>
              <Field label="Name" value={sn} onChangeText={setSn} placeholder="2026-27 Sem 2" />
              <Field label="Start date (YYYY-MM-DD)" value={ss} onChangeText={setSs} placeholder="2027-01-11" autoCapitalize="none" />
              <Field label="End date (YYYY-MM-DD)" value={se} onChangeText={setSe} placeholder="2027-06-20" autoCapitalize="none" />
              <ConfirmBtn kind="primary" label="Start semester" message={`Close ${cur?.name} and start ${sn || 'the new semester'}?`} onConfirm={async () => {
                if (!isDate(ss) || !isDate(se)) { await run(async () => { throw new Error('Enter dates as YYYY-MM-DD.'); }); return; }
                if (await run(() => api.startSemester({ name: sn, start: ss, end: se }), `${sn} started`)) { setSn(''); setSs(''); setSe(''); }
              }} />
            </Card>}
          </Grid>
        </>;
      }}</Async>
    </Screen>
  );
}
