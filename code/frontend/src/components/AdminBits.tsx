import React from 'react';
import { View } from 'react-native';
import { H1, Mu, Row } from './ui';

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return <Row top wrap><View style={{ flexShrink: 1 }}><H1>{title}</H1>{sub ? <Mu style={{ marginTop: 4 }}>{sub}</Mu> : null}</View>{right}</Row>;
}
/** Responsive grid: children wrap, each at least `min` wide. */
export function Grid({ children, min = 150, gap = 14 }: { children: React.ReactNode; min?: number; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>{React.Children.map(children, (c) => <View style={{ flexGrow: 1, flexBasis: min, minWidth: min }}>{c}</View>)}</View>;
}
