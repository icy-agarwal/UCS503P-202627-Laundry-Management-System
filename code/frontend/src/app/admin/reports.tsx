import React from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Bars, Card, H2, Mu, Screen, T } from '../../components/ui';
import { Grid, PageHead } from '../../components/AdminBits';
import { COMPLAINT_TYPES } from '../../constants/domain';
import { useApi } from '../../hooks/useApi';
import { pcs } from '../../lib/format';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export default function Reports() {
  const b = useApi(() => api.listBatches()), c = useApi(() => api.listComplaints()), cfg = useApi(() => api.config());
  return (
    <Screen wide onRefresh={() => { b.reload(); c.reload(); }}>
      <PageHead title="Reports" sub="All recorded batches. Hostels with no batches yet are left out." />
      <Async q={b}>{(bs) => <Async q={c}>{(cs) => <Async q={cfg}>{(conf) => {
        const days = (x: (typeof bs)[number]) => (x.returnedAt ? (+new Date(x.returnedAt) - +new Date(x.submittedAt)) / 864e5 : null);
        const per = conf.hostels.filter((h) => bs.some((x) => x.hostelId === h.id)).map((h) => {
          const l = bs.filter((x) => x.hostelId === h.id), d = l.map(days).filter((n): n is number => n != null);
          return { name: h.name, n: l.length, pcs: sum(l.map((x) => pcs(x.items))), tat: d.length ? sum(d) / d.length : 0, late: l.filter((x) => x.late).length };
        });
        const all = bs.map(days).filter((n): n is number => n != null);
        const byType: [string, number][] = COMPLAINT_TYPES.map((t) => [t, cs.filter((x) => x.type === t).length] as [string, number]).filter((x) => x[1]);
        const stat = (n: string | number, l: string) => <Card><T w="x" size={30}>{n}</T><Mu style={{ marginTop: 6 }}>{l}</Mu></Card>;
        return <>
          <Grid min={200}>{stat(bs.length, 'Batches received')}{stat(all.length ? (sum(all) / all.length).toFixed(1) : '0', 'Average days to return')}{stat(cs.length, 'Complaints filed')}</Grid>
          <Grid min={320}>
            <Card style={{ gap: 12 }}><H2>Batches per hostel</H2><Bars items={per.map((h) => [h.name, h.n])} /></Card>
            <Card style={{ gap: 12 }}><H2>Average days to return</H2><Bars max={Math.max(7, ...per.map((h) => h.tat))} items={per.map((h) => [h.name, h.tat, h.tat.toFixed(1)])} /></Card>
            <Card style={{ gap: 12 }}><H2>Pieces washed per hostel</H2><Bars items={per.map((h) => [h.name, h.pcs])} /></Card>
            <Card style={{ gap: 12 }}><H2>Complaints by type</H2>{byType.length ? <Bars items={byType} /> : <Mu>No complaints yet.</Mu>}</Card>
          </Grid>
          <Card style={{ gap: 12 }}><H2>Delayed batches</H2>{per.some((h) => h.late) ? <Bars items={per.filter((h) => h.late).map((h) => [h.name, h.late])} /> : <Mu>Nothing is delayed.</Mu>}</Card>
        </>;
      }}</Async>}</Async>}</Async>
    </Screen>
  );
}
