import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../api';
import { ApiError, Batch } from '../../api/types';
import { Btn, Card, Err, Field, H1, Mu, Row, Screen, T, useRun } from '../../components/ui';
import { Kv } from '../../components/Bits';
import { useTheme } from '../../hooks/useTheme';
import { did, listItems, pcs } from '../../lib/format';

type Res = { k: 'ok' | 'done'; b: Batch } | { k: 'used'; b: Batch } | { k: 'bad' } | { k: 'err' } | null;

export default function Scan() {
  const th = useTheme(), run = useRun();
  const [perm, ask] = useCameraPermissions();
  const [cam, setCam] = useState(false), [code, setCode] = useState(''), [err, setErr] = useState(''), [res, setRes] = useState<Res>(null), [busy, setBusy] = useState(false);
  const last = useRef('');
  const reset = () => { setRes(null); setErr(''); setCam(false); last.current = ''; };

  const lookup = async (raw: string) => {
    last.current = raw; setBusy(true);
    try {
      const r = await api.lookupPickup(raw);
      setRes(r.kind === 'invalid' ? { k: 'bad' } : { k: r.kind, b: r.batch });
    } catch (e) { setRes(e instanceof ApiError && e.network ? { k: 'err' } : { k: 'bad' }); }
    finally { setBusy(false); }
  };
  const openCam = async () => {
    setErr('');
    const p = perm?.granted ? perm : await ask();
    if (!p.granted) return setErr('Camera permission was denied. Enter the backup code instead.');
    setCam(true);
  };
  const look = () => { const c = code.replace(/\s/g, ''); if (!/^\d{6}$/.test(c)) return setErr('Enter all 6 digits.'); setErr(''); void lookup(c); };
  const row = (k: string, v: string, last?: boolean) => <Kv k={k} v={v} last={last} />;

  let body: React.ReactNode;
  if (res?.k === 'ok') {
    const b = res.b;
    body = <>
      <Card tone="ok"><T w="x" size={12} color={th.grt}>MATCH CONFIRMED</T>{row('Student', b.studentId)}{row('Laundry', did(b))}{row('Pieces', String(pcs(b.items)))}{row('Status', 'Ready for pickup', true)}<Mu>{listItems(b.items)}</Mu></Card>
      <Mu>Hand over the laundry first, then confirm.</Mu>
      <Btn kind="primary" label="Confirm collection" loading={busy} onPress={async () => { setBusy(true); const ok = await run(() => api.confirmCollection(b.rid), 'Collected. Token invalidated'); setBusy(false); if (ok) setRes({ k: 'done', b }); }} />
      <Btn label="Cancel" onPress={reset} />
    </>;
  } else if (res?.k === 'done') {
    body = <><Card tone="ok"><T w="x" size={12} color={th.grt}>COLLECTED</T><T w="b" style={{ marginTop: 6 }}>{did(res.b)} handed to {res.b.studentId}. The QR token is now invalid.</T></Card><Btn kind="primary" label="Scan next" onPress={reset} /></>;
  } else if (res?.k === 'used') {
    body = <><Card tone="bad"><T w="x" size={12} color={th.rdt}>REJECTED: TOKEN ALREADY USED</T><T style={{ marginTop: 6 }}>{did(res.b)} was already collected by {res.b.studentId}. Do not hand over anything.</T></Card><Btn label="Scan again" onPress={reset} /></>;
  } else if (res?.k === 'bad') {
    body = <><Card tone="bad"><T w="x" size={12} color={th.rdt}>REJECTED: INVALID OR EXPIRED CODE</T><T style={{ marginTop: 6 }}>No laundry at this counter matches this code. Ask the student to reopen their Pickup QR.</T></Card><Btn label="Scan again" onPress={reset} /></>;
  } else if (res?.k === 'err') {
    body = <><Card tone="bad"><T w="x" size={12} color={th.rdt}>CAN’T REACH THE SERVER</T><T style={{ marginTop: 6 }}>Nothing was recorded. Check the connection and retry. Scanning twice is safe.</T></Card><Btn kind="primary" label="Retry" onPress={() => lookup(last.current)} /><Btn label="Cancel" onPress={reset} /></>;
  } else {
    body = <>
      <View style={{ height: 230, borderRadius: 18, backgroundColor: '#0B0E14', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {cam ? <CameraView style={{ position: 'absolute', inset: 0 } as any} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => { if (data && data !== last.current) { setCam(false); void lookup(data); } }} /> : <T w="b" size={13} color="#A3ABB8">Camera is off</T>}
      </View>
      {cam ? <Btn label="Close camera" onPress={() => setCam(false)} /> : <Btn kind="primary" label="Open camera to scan QR" onPress={openCam} />}
      <Field label="Or enter the 6-digit backup code" value={code} onChangeText={(t) => setCode(t.replace(/[^\d ]/g, ''))} inputMode="numeric" keyboardType="number-pad" maxLength={7} placeholder="482 915" onSubmitEditing={look} />
      <Btn kind="primary" label="Look up" loading={busy} onPress={look} />
      <Err>{err}</Err>
    </>;
  }
  return <Screen><H1>Scan Pickup QR</H1>{body}</Screen>;
}
