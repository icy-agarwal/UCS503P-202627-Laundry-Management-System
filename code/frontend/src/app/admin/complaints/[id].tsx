import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Btn, Screen } from '../../../components/ui';
import { ComplaintBody } from '../../../components/ComplaintView';
import { useApi } from '../../../hooks/useApi';

export default function AdminComplaint() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter();
  const q = useApi(() => api.getComplaint(id), [id]);
  return (
    <Screen wide>
      <Btn small label="‹ Back" style={{ alignSelf: 'flex-start' }} onPress={() => (r.canGoBack() ? r.back() : r.replace('/admin/complaints'))} />
      <Async q={q}>{(c) => <ComplaintBody c={c} role="admin" onTrace={() => r.navigate({ pathname: '/admin/audit', params: { q: c.batchId } })} />}</Async>
    </Screen>
  );
}
