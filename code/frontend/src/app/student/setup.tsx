import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api';
import type { StudentProfile } from '../../api/types';
import { Btn, Card, Chips, Err, Field, H1, Header, Label, Mu, Screen, T, useRun } from '../../components/ui';
import { DaysStrip } from '../../components/Bits';
import { DAY_NAMES } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function Setup() {
  const { me, refresh } = useAuth();
  const r = useRouter(), th = useTheme(), run = useRun();
  const cfg = useApi(() => api.config());
  const editing = !!me?.profile;
  const [p, setP] = useState<Partial<StudentProfile>>(me?.profile ?? {});
  const [ay, setAy] = useState(me?.profile?.admissionYear ? String(me.profile.admissionYear) : '');
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const list = (cfg.data?.hostels ?? []).filter((h) => h.group === p.gender);
  const hostel = cfg.data?.hostels.find((h) => h.id === p.hostelId);

  const save = async () => {
    const name = (p.name ?? '').trim(), room = (p.room ?? '').trim(), phone = (p.phone ?? '').trim();
    if (!name) return setErr('Please enter your name.');
    if (!p.hostelId || !p.gender) return setErr('Please choose your hostel.');
    if (!/^[A-Za-z0-9\-/ ]{1,8}$/.test(room)) return setErr('Please enter a valid room number.');
    if (!/^\d{10}$/.test(phone)) return setErr('Mobile number must be 10 digits.');
    if (!/^\d{4}$/.test(ay) || +ay < 2000 || +ay > new Date().getFullYear()) return setErr('Please enter a valid admission year.');
    setErr(''); setBusy(true);
    const ok = await run(async () => { await api.saveProfile({ name, room, phone, hostelId: p.hostelId!, gender: p.gender!, admissionYear: +ay }); await refresh(); }, editing ? 'Profile updated' : 'Welcome! You’re all set');
    setBusy(false);
    if (ok) r.replace(editing ? '/student/profile' : '/student/home');
  };

  return (
    <Screen footer={<Btn kind="primary" label={editing ? 'Save changes' : 'Save & Continue'} onPress={save} loading={busy} />}>
      {editing ? <Header title="Edit profile" fallback="/student/profile" /> : (
        <View style={{ marginTop: 18, gap: 6 }}><Mu>One-time setup</Mu><H1>Your hostel details</H1><Mu>We’ll remember these so you don’t have to enter them again.</Mu></View>
      )}
      <Field label="Full name" value={p.name ?? ''} onChangeText={(name) => setP((s) => ({ ...s, name }))} placeholder="e.g. Devansh Dhawan" autoCapitalize="words" />
      <View style={{ gap: 8 }}>
        <Label>Hostel type</Label>
        <Chips options={['Boys', 'Girls'] as const} value={p.gender} onChange={(gender) => setP((s) => ({ ...s, gender, hostelId: cfg.data?.hostels.find((h) => h.id === s.hostelId)?.group === gender ? s.hostelId : undefined }))} />
      </View>
      <View style={{ gap: 8 }}>
        <Label>Hostel</Label>
        {p.gender ? <Chips options={list.map((h) => ({ v: h.id, l: h.name }))} value={p.hostelId} onChange={(hostelId) => setP((s) => ({ ...s, hostelId }))} /> : <Mu>Choose Boys or Girls first.</Mu>}
      </View>
      {hostel ? (
        <Card tone="info" style={{ gap: 8 }}>
          <T w="b" size={13} color={th.blt}>{hostel.name} laundry days</T>
          <T size={14} color={th.blt}>Collection &amp; pickup on {DAY_NAMES[hostel.days[0]]} and {DAY_NAMES[hostel.days[1]]}</T>
          <DaysStrip days={hostel.days} />
        </Card>
      ) : null}
      <Field label="Room number" value={p.room ?? ''} onChangeText={(room) => setP((s) => ({ ...s, room }))} placeholder="e.g. 214" maxLength={8} />
      <Field label="Mobile number" value={p.phone ?? ''} onChangeText={(t) => setP((s) => ({ ...s, phone: t.replace(/\D/g, '') }))} placeholder="10-digit number" inputMode="numeric" keyboardType="number-pad" maxLength={10} />
      <Field label="Admission year" value={ay} onChangeText={(t) => setAy(t.replace(/\D/g, ''))} placeholder="e.g. 2024" inputMode="numeric" keyboardType="number-pad" maxLength={4} />
      {editing && hostel && me?.profile && hostel.id !== me.profile.hostelId ? <Card tone="warn"><T size={13} color={th.amt}>Changing hostel starts a new hostel enrollment for this semester. Your past laundry stays with the old hostel.</T></Card> : null}
      <Err>{err}</Err>
    </Screen>
  );
}
