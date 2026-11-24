import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, isMock } from '../../../api';
import { Async, Banner, Btn, Card, Chip, Field, H1, ItemIcon, Label, Mu, Row, Screen, Stepper, T, useRun } from '../../../components/ui';
import { counterSlot, setDemoClock, useDemoClock } from '../../../constants/schedule';
import { DAY_SHORT } from '../../../constants/domain';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';

export default function Submit() {
  const { me } = useAuth();
  const r = useRouter(), th = useTheme(), run = useRun(), clock = useDemoClock();
  const cfg = useApi(() => api.config());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [remark, setRemark] = useState(''), [busy, setBusy] = useState(false);
  const p = me!.profile!;
  const hostel = cfg.data?.hostels.find((h) => h.id === p.hostelId);
  const slot = counterSlot(hostel, clock, cfg.data?.enforceCounterHours !== false);
  const n = Object.values(cart).reduce((a, x) => a + x, 0);
  const renewed = me!.enrollment?.status === 'Active';
  const can = n > 0 && slot.open && renewed;

  const submit = async () => {
    setBusy(true);
    const ok = await run(() => api.submitRequest(cart, remark), 'Request submitted');
    setBusy(false);
    if (ok) { setCart({}); setRemark(''); r.navigate('/student/home'); }
  };

  return (
    <Screen footer={<Btn kind="primary" label={`Submit Laundry${n ? ` · ${n} pieces` : ''}`} disabled={!can} loading={busy} onPress={submit} />}>
      <View style={{ gap: 4 }}><H1>Submit Laundry</H1><Mu>{hostel?.name} · Room {p.room}. Staff will confirm the exact count on drop-off.</Mu></View>
      <Banner tone={slot.tone} title={slot.title} sub={slot.sub} icon={slot.open ? 'ok' : slot.tone === 'bl' ? 'bag' : 'lock'} />
      {!renewed ? <Card tone="warn"><T w="b" color={th.amt}>Renew your hostel for this semester on the Home tab before submitting laundry.</T></Card> : null}
      <Async q={cfg}>{(c) => (
        <Card pad={14} style={{ paddingVertical: 4 }}>
          {c.categories.filter((x) => x.on).map((x, i, a) => (
            <Row key={x.name} style={{ paddingVertical: 10, borderBottomWidth: i === a.length - 1 ? 0 : 1, borderBottomColor: th.bd }}>
              <Row start gap={12} style={{ flex: 1 }}><ItemIcon name={x.name} size={44} glyph={24} /><T w="b" style={{ flexShrink: 1 }}>{x.name}</T></Row>
              <Stepper value={cart[x.name] ?? 0} onChange={(v) => setCart((s) => ({ ...s, [x.name]: v }))} />
            </Row>
          ))}
        </Card>
      )}</Async>
      <Field label="Remarks (optional)" value={remark} onChangeText={setRemark} multiline placeholder="e.g. small tear on one shirt collar" />
      {isMock ? (
        <Card style={{ borderStyle: 'dashed', gap: 8 }}>
          <Label>Demo only: simulate day / time</Label>
          <Row wrap start gap={8}>
            <Chip label="Live" on={clock.d == null} onPress={() => setDemoClock(null, null)} />
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <Chip key={d} label={DAY_SHORT[d]} on={clock.d === d} onPress={() => setDemoClock(d, null)} />)}
          </Row>
          {clock.d != null ? <Row wrap start gap={8}>{([[780, '1:00 PM'], [930, '3:30 PM'], [1200, '8:00 PM']] as const).map(([m, l]) => <Chip key={m} label={l} on={(clock.m ?? 780) === m} onPress={() => setDemoClock(clock.d, m)} />)}</Row> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
