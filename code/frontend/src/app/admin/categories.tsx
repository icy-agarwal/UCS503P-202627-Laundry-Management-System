import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api';
import { Async, Btn, Card, Chip, Field, H2, ItemIcon, Pill, Row, Screen, Table, useRun, T, Mu } from '../../components/ui';
import { Grid, PageHead } from '../../components/AdminBits';
import { useApi } from '../../hooks/useApi';

export default function Categories() {
  const run = useRun();
  const cfg = useApi(() => api.config());
  const [cat, setCat] = useState(''), [cond, setCond] = useState('');
  return (
    <Screen wide onRefresh={cfg.reload}>
      <PageHead title="Categories" sub="What staff can choose when they count and describe clothes. Retiring a category keeps it on old batches." />
      <Async q={cfg}>{(c) => (
        <Grid min={320}>
          <View style={{ gap: 14 }}>
            <H2>Clothing categories</H2>
            <Table cols={[{ h: 'Category', min: 180 }, { h: 'Status', min: 140 }, { h: '', min: 100 }]}
              rows={c.categories.map((x) => [<Row key="a" start gap={10}><ItemIcon name={x.name} size={30} glyph={18} /><T size={14}>{x.name}</T></Row>, <Pill key="b" text={x.on ? 'Offered to staff' : 'Retired'} tone={x.on ? 'gr' : 'gy'} />, <Btn key="c" small label={x.on ? 'Retire' : 'Restore'} onPress={() => run(() => api.toggleCategory(x.name), `${x.name} ${x.on ? 'retired' : 'restored'}`)} />])} />
            <Card style={{ gap: 10 }}><H2>Add category</H2><Row><View style={{ flex: 1 }}><Field value={cat} onChangeText={setCat} placeholder="e.g. Jacket" /></View><Btn kind="primary" label="Add" onPress={async () => { if (await run(() => api.addCategory(cat), `${cat} added`)) setCat(''); }} /></Row></Card>
          </View>
          <View style={{ gap: 14 }}>
            <H2>Existing conditions</H2>
            <Card style={{ gap: 12 }}>
              <Row wrap start gap={8}>{c.conditions.map((x) => <Chip key={x} label={`${x} ✕`} onPress={() => run(() => api.removeCondition(x), `${x} removed`)} />)}{!c.conditions.length ? <Mu>No conditions.</Mu> : null}</Row>
              <Row><View style={{ flex: 1 }}><Field value={cond} onChangeText={setCond} placeholder="e.g. Torn zip" /></View><Btn kind="primary" label="Add" onPress={async () => { if (await run(() => api.addCondition(cond), `${cond} added`)) setCond(''); }} /></Row>
            </Card>
          </View>
        </Grid>
      )}</Async>
    </Screen>
  );
}
