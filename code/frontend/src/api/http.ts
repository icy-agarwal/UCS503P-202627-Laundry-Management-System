/**
 * REAL BACKEND CLIENT — talks to the Express API. See docs/API_CONTRACT.md for every endpoint this expects.
 * Every request carries the Supabase access token as a Bearer token; the server decides what the caller may see.
 */
import { Api, ApiError, Me } from './types';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
let token: string | null = null;

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0, true);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) throw new ApiError(data?.error ?? data?.message ?? `Request failed (${res.status})`, res.status);
  return data as T;
}
const get = <T,>(p: string) => req<T>('GET', p);
const post = <T,>(p: string, b?: unknown) => req<T>('POST', p, b ?? {});
const put = <T,>(p: string, b?: unknown) => req<T>('PUT', p, b ?? {});
const patch = <T,>(p: string, b?: unknown) => req<T>('PATCH', p, b ?? {});
const del = <T,>(p: string) => req<T>('DELETE', p);
const q = (o: Record<string, string | undefined>) => {
  const s = Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&');
  return s ? `?${s}` : '';
};
const enc = encodeURIComponent;

export const httpApi: Api = {
  setSession(t) { token = t; },
  auth: {
    async sendOtp(identifier) { await post('/auth/send-otp', { email: identifier }); return identifier; },
    async verifyOtp(email, code) {
      // Sends the code under both common field names; keep whichever your verify-otp route reads.
      const r = await post<any>('/auth/verify-otp', { email, otp: code, token: code });
      // Accepts { session: { access_token }, user } (Supabase shape) or { access_token } / { token }.
      const t: string | undefined = r?.session?.access_token ?? r?.access_token ?? r?.token;
      if (!t) throw new ApiError('Sign-in succeeded but the server did not return a session token.', 500);
      return { token: t, me: r?.me as Me | undefined };
    },
  },
  me: () => get('/me'),
  saveProfile: (p) => put('/me/profile', p),
  renewEnrollment: () => post('/me/renew'),
  config: () => get('/config'),

  listBatches: (x) => get(`/batches${q({ status: x?.status?.join(','), search: x?.search })}`),
  getBatch: (id) => get(`/batches/${enc(id)}`),
  submitRequest: (items, remark) => post('/batches', { items, remark }),
  verifyRequest: (rid, v) => post(`/batches/${enc(rid)}/verify`, v),
  rejectRequest: (rid, reason) => post(`/batches/${enc(rid)}/reject`, { reason }),
  generateBatchId: (rid) => post(`/batches/${enc(rid)}/batch-id`),
  transition: (rids, to) => post('/batches/transition', { ids: rids, to }),
  sendDelayNotice: async (rid) => { await post(`/batches/${enc(rid)}/delay-notice`); },
  getPickup: (rid) => get(`/batches/${enc(rid)}/pickup`),
  lookupPickup: (code) => post('/pickup/lookup', { code }),
  confirmCollection: (rid) => post('/pickup/confirm', { rid }),

  listComplaints: () => get('/complaints'),
  getComplaint: (id) => get(`/complaints/${enc(id)}`),
  createComplaint: (i) => post('/complaints', i),
  addComplaintNote: (id, text) => post(`/complaints/${enc(id)}/notes`, { text }),
  advanceComplaint: (id, note) => post(`/complaints/${enc(id)}/advance`, { note }),
  escalateComplaint: (id) => post(`/complaints/${enc(id)}/escalate`),
  sendBackComplaint: (id) => post(`/complaints/${enc(id)}/send-back`),

  listNotifications: () => get('/notifications'),
  markAllRead: async () => { await post('/notifications/read-all'); },

  listStudents: (s) => get(`/admin/students${q({ search: s })}`),
  getStudent: (id) => get(`/admin/students/${enc(id)}`),
  changeHostel: (id, hostelId) => post(`/admin/students/${enc(id)}/change-hostel`, { hostelId }),
  setStudentActive: (id, active) => patch(`/admin/students/${enc(id)}`, { active }),
  listStaff: () => get('/admin/staff'),
  addStaff: (i) => post('/admin/staff', i),
  setStaffActive: (id, active) => patch(`/admin/staff/${enc(id)}`, { active }),
  addHostel: (i) => post('/admin/hostels', i),
  setCounterEnforcement: async (on) => { await post('/admin/settings/counter-hours', { on }); },
  startSemester: (i) => post('/admin/semesters', i),
  approveRenewals: async () => (await post<{ approved: number }>('/admin/renewals/approve')).approved,
  addCategory: async (name) => { await post('/admin/categories', { name }); },
  toggleCategory: async (name) => { await post(`/admin/categories/${enc(name)}/toggle`); },
  addCondition: async (name) => { await post('/admin/conditions', { name }); },
  removeCondition: async (name) => { await del(`/admin/conditions/${enc(name)}`); },
  listAudit: (x) => get(`/admin/audit${q({ search: x?.search, role: x?.role })}`),
};
