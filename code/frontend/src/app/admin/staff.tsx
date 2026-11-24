import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Btn, Card, Chips, ConfirmBtn, Err, Field, H2, Label, Mu, Pill, Screen, Table, T, useRun } from '../../components/ui';
import { PageHead } from '../../components/AdminBits';
import { useApi } from '../../hooks/useApi';

export default function Staff() {
  const run = useRun();
  const q = useApi(() => api.listStaff()), cfg = useApi(() => api.config());
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [phone, setPhone] = useState(''), [h, setH] = useState<string>(), [err, setErr] = useState('');
  const hn = (id: string) => cfg.data?.hostels.find((x) => x.id === id)?.name ?? id;
  const add = async () => {
    setErr('');
    try { await api.addStaff({ name, email, phone, hostelId: h ?? cfg.data!.hostels[0].id }); } catch (e) { return setErr(e instanceof Error ? e.message : String(e)); }
    await run(async () => {}, `${name} added`); setName(''); setEmail(''); setPhone('');
  };
  return (
    <Screen wide onRefresh={q.reload}>
      <PageHead title="Staff" sub={q.data ? `${q.data.filter((m) => m.active).length} active` : undefined} />
      <Card style={{ gap: 12 }}>
        <H2>Add staff</H2>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Field label="Mobile number (used to log in)" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} placeholder="10-digit number" inputMode="numeric" maxLength={10} />
        <Field label="Email (the login code is sent here)" value={email} onChangeText={setEmail} placeholder="name@thapar.edu" autoCapitalize="none" keyboardType="email-address" />
        <Label>Hostel counter</Label>
        <Async q={cfg}>{(c) => <Chips options={c.hostels.map((x) => ({ v: x.id, l: x.name }))} value={h ?? c.hostels[0].id} onChange={setH} />}</Async>
        <Err>{err}</Err>
        <View style={{ alignSelf: 'flex-start' }}><Btn kind="primary" label="Add staff" onPress={add} /></View>
      </Card>
      <Async q={q}>{(l) => <Table cols={[{ h: 'Staff member', min: 240 }, { h: 'Mobile', min: 120 }, { h: 'Hostel counter', min: 170 }, { h: 'Status', min: 100 }, { h: 'Account', min: 230 }]}
        rows={l.map((m) => [
          <View key="a"><T size={14}>{m.name}</T><Mu style={{ fontSize: 12 }}>{m.email}</Mu></View>, m.phone ?? '—', m.hostelId ? hn(m.hostelId) : 'All hostels',
          <Pill key="b" text={m.active ? 'Active' : 'Inactive'} tone={m.active ? 'gr' : 'gy'} />,
          m.active
            ? <ConfirmBtn key="c" small label="Deactivate" message={`Deactivate ${m.name}?`} onConfirm={async () => { await run(() => api.setStaffActive(m.id, false), `${m.name} deactivated`); }} />
            : <ConfirmBtn key="c" small kind="default" label="Reactivate" message={`Reactivate ${m.name}?`} onConfirm={async () => { await run(() => api.setStaffActive(m.id, true), `${m.name} reactivated`); }} />,
        ])} />}</Async>
    </Screen>
  );
}
