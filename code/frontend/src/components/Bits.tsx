import React from 'react';
import { View } from 'react-native';
import type { Items, Status } from '../api/types';
import { DAY_SHORT, studentLabel, studentTone, STATUS } from '../constants/domain';
import { useTheme } from '../hooks/useTheme';
import { ItemIcon, Pill, Row, T } from './ui';

export function Kv({ k, v, last }: { k: string; v: React.ReactNode; last?: boolean }) {
  const th = useTheme();
  return (
    <Row style={{ paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: th.bd }}>
      <T mu>{k}</T>
      {typeof v === 'string' || typeof v === 'number' ? <T w="b" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</T> : v}
    </Row>
  );
}

export function DaysStrip({ days }: { days: number[] }) {
  const th = useTheme();
  return (
    <Row gap={5}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10, backgroundColor: days.includes(i) ? th.pr : th.off }}>
          <T w="x" size={11} color={days.includes(i) ? '#fff' : th.mu}>{DAY_SHORT[i]}</T>
        </View>
      ))}
    </Row>
  );
}

export function ItemChips({ items }: { items: Items }) {
  const th = useTheme();
  return (
    <Row wrap start gap={6}>
      {Object.entries(items).map(([k, v]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: th.bg, borderRadius: 12, paddingVertical: 4, paddingLeft: 4, paddingRight: 10 }}>
          <ItemIcon name={k} size={28} glyph={16} /><T w="b" size={13}>{k} ×{v}</T>
        </View>
      ))}
    </Row>
  );
}

export const StudentPill = ({ status }: { status: Status }) => <Pill text={studentLabel(status)} tone={studentTone(status)} />;
export const StaffPill = ({ status }: { status: Status }) => <Pill text={STATUS[status][0]} tone={STATUS[status][1]} />;
