import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../api';
import type { Batch } from '../api/types';
import { Btn, Card, Mu, Pill, Row, H2, T, useRun } from './ui';
import { StaffPill } from './Bits';
import { useTheme } from '../hooks/useTheme';
import { did, listItems, pcs } from '../lib/format';

type Next = { label: string; run: () => Promise<void> | void };

export function useNext(b: Batch): Next | null {
  const r = useRouter(), run = useRun();
  const tr = (to: 'IN_LAUNDRY' | 'RETURNED' | 'READY_FOR_PICKUP', ok: string) => () => { void run(() => api.transition([b.rid], to), ok); };
  switch (b.status) {
    case 'WAITING_FOR_VERIFICATION': return { label: 'Verify', run: () => r.push(`/staff/verify/${b.rid}`) };
    case 'AWAITING_TAGGING': return { label: b.bid ? 'Open tag' : 'Generate tag', run: () => r.push(`/staff/tag/${b.rid}`) };
    case 'TAGGED': return { label: 'Send to laundry', run: tr('IN_LAUNDRY', `${did(b)} is now in laundry. Student notified`) };
    case 'IN_LAUNDRY': return { label: 'Mark returned', run: tr('RETURNED', `${did(b)} marked returned`) };
    case 'RETURNED': return { label: 'Mark ready', run: tr('READY_FOR_PICKUP', `${did(b)} ready. Student’s QR is active`) };
    case 'READY_FOR_PICKUP': return { label: 'Scan to hand over', run: () => r.navigate('/staff/scan') };
    default: return null;
  }
}

export function NextButton({ b, flex, small }: { b: Batch; flex?: boolean; small?: boolean }) {
  const n = useNext(b);
  return n ? <Btn kind="primary" label={n.label} flex={flex} small={small} onPress={n.run} /> : null;
}

export function BatchCard({ b, selected, onSelect }: { b: Batch; selected?: boolean; onSelect?: () => void }) {
  const r = useRouter(), th = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      <Row top>
        {onSelect ? (
          <View onTouchEnd={onSelect} accessibilityRole="checkbox" style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: selected ? th.pr : th.mu, backgroundColor: selected ? th.pr : th.card, alignItems: 'center', justifyContent: 'center' }}>
            {selected ? <T w="x" color="#fff">✓</T> : null}
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}><H2>{did(b)}</H2><Mu>{b.studentId} · {b.studentName}</Mu></View>
        <View style={{ gap: 6, alignItems: 'flex-end' }}><StaffPill status={b.status} />{b.late && b.status === 'IN_LAUNDRY' ? <Pill text="Delayed" tone="rd" /> : null}</View>
      </Row>
      <View style={{ borderTopWidth: 1, borderTopColor: th.bd, paddingTop: 10 }}><Mu>{pcs(b.items)} pieces · {listItems(b.items)}</Mu></View>
      <Row><Btn flex small label="Details" onPress={() => r.push(`/staff/batch/${b.rid}`)} /><NextButton b={b} flex small /></Row>
    </Card>
  );
}
