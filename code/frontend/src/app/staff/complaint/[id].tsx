import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../api';
import { Async, Header, Screen } from '../../../components/ui';
import { ComplaintBody } from '../../../components/ComplaintView';
import { useApi } from '../../../hooks/useApi';

export default function StaffComplaint() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRouter();
  const q = useApi(() => api.getComplaint(id), [id]);
  return (
    <Screen>
      <Header title="Complaint" fallback="/staff/complaints" />
      <Async q={q}>{(c) => <ComplaintBody c={c} role="staff" onTrace={() => r.push(`/staff/batch/${c.batchId}`)} />}</Async>
    </Screen>
  );
}
