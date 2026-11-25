/**
 * SUPABASE CLIENT — the app talks straight to Supabase (no Express server).
 *  - Login: Supabase email OTP. Staff may type their mobile number; the code goes to their registered email.
 *  - Data: Postgres functions (RPC), all SECURITY DEFINER, installed by supabase/01_schema_and_functions.sql.
 *    The browser only holds the publishable key; row-level security stays on and every function checks who is calling.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Api, ApiError, AuditEntry, Batch, Complaint, ComplaintStatus, Config, Items, LogEntry, Me, Notification, Role, StaffRec, Status, StudentRec,
} from './types';
import { STATUS } from '../constants/domain';

let client: SupabaseClient | null = null;
const sb = (): SupabaseClient => (client ??= createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost', process.env.EXPO_PUBLIC_SUPABASE_KEY || 'missing', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
}));

type J = Record<string, any>;
async function rpc<T = any>(fn: string, args?: J): Promise<T> {
  let res;
  try { res = await sb().rpc(fn, args); } catch { throw new ApiError('Can’t reach the server. Check your connection and try again.', 0, true); }
  if (res.error) {
    const m = res.error.message || 'Request failed';
    throw new ApiError(/failed to fetch|networkerror|network request failed/i.test(m) ? 'Can’t reach the server. Check your connection and try again.' : m, 400, /failed to fetch|networkerror/i.test(m));
  }
  return res.data as T;
}
const num = (id: string) => parseInt(String(id).replace(/\D/g, ''), 10);
const rollOf = (email: string) => email.split('@')[0].split('.')[0].toUpperCase();

/* ---------------------------------------------------------------- mapping */
const DB_STATUS: Record<string, Status> = { SUBMITTED: 'WAITING_FOR_VERIFICATION', VERIFIED: 'AWAITING_TAGGING' };
const toStatus = (raw: string): Status => DB_STATUS[raw] ?? (raw in STATUS ? (raw as Status) : 'WAITING_FOR_VERIFICATION');
/** audit rows store raw status codes; show friendly labels, but leave other text ("Shirts 3") alone */
const label = (v?: string | null) => (v ? (v in DB_STATUS || v in STATUS ? STATUS[toStatus(v)][0] : v) : undefined);
const toLog = (e: J): LogEntry => ({ t: e.t, who: e.who ?? 'Staff', role: e.role ?? undefined, a: e.a, from: label(e.from), to: label(e.to) });

function toBatch(r: J): Batch {
  return {
    rid: `LR-${r.id}`, bid: r.tag_code ?? null, studentId: r.roll, studentName: r.student_name, hostelId: r.hostel_code ?? '', room: r.room ?? undefined, semesterId: '',
    status: toStatus(r.status), late: !!r.late, submittedAt: r.submitted_at, expectedOn: r.expected_completion ? String(r.expected_completion).slice(0, 10) : null,
    returnedAt: r.returned_at ?? null, items: (r.items ?? {}) as Items, original: (r.original ?? {}) as Items,
    conditions: (r.conditions ?? []) as { c: string; k: string }[], remark: r.remarks ?? '', log: (r.log ?? []).map(toLog),
    tokenActive: !!r.token_active, tokenUsed: !!r.token_used, complaintId: r.complaint_id ? `C-${r.complaint_id}` : null,
  };
}
const CS: Record<string, ComplaintStatus> = { OPEN: 'Open', UNDER_REVIEW: 'Under review', IN_PROGRESS: 'Under review', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const toComplaint = (r: J): Complaint => ({
  id: `C-${r.id}`, batchId: r.batch, studentId: r.roll, studentName: r.student_name, hostelId: r.hostel_code ?? '', type: r.type, status: CS[r.status] ?? 'Open',
  escalated: !!r.escalated, filedAt: r.filed_at, description: r.description ?? '', notes: (r.notes ?? []).map((n: J) => ({ t: n.t, who: n.who, role: n.role, a: n.a })),
});
const toStudent = (r: J): StudentRec => ({
  id: r.roll, name: r.name ?? '', phone: r.phone ?? '', email: r.email, active: !!r.active,
  enrollments: (r.enrollments ?? []).map((e: J) => ({ semesterId: String(e.semester_id), hostelId: e.hostel_code ?? '', status: e.status })),
});
const toStaff = (r: J): StaffRec => ({ id: String(r.id), name: r.name, email: r.email, phone: r.phone ?? undefined, hostelId: r.hostel_code ?? '', active: !!r.active, role: r.role });

let catIds: Record<string, number> = {};
let role: Role | null = null;

async function session() {
  const { data, error } = await sb().auth.getSession();
  if (error || !data.session?.user.email) throw new ApiError('Not signed in', 401);
  return data.session.user.email.toLowerCase();
}

export const supabaseApi: Api = {
  setSession(token) { if (token === null) { role = null; void sb().auth.signOut(); } },
  auth: {
    async sendOtp(identifier) {
      const raw = identifier.trim();
      let email = raw.toLowerCase();
      if (!raw.includes('@')) {
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 10) throw new ApiError('Enter your college email, or your 10-digit mobile number if you are staff.');
        const found = await rpc<string | null>('staff_login_email', { p_phone: digits });
        if (!found) throw new ApiError('This mobile number is not registered as staff. Ask the admin to add you.');
        email = found;
      }
      const { error } = await sb().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new ApiError(error.message, 400);
      return email;
    },
    async verifyOtp(email, code) {
      const { data, error } = await sb().auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw new ApiError(error.message, 400);
      if (!data.session) throw new ApiError('Sign-in failed. Please try again.', 401);
      return { token: data.session.access_token };
    },
  },

  async me() {
    const email = await session();
    const r = await rpc<J>('get_my_role');
    role = r.role as Role;
    if (role !== 'student') return { id: String(r.staff_id), role, email, name: r.name, hostelId: r.hostel_code ?? undefined };
    const p = await rpc<J | null>('get_student_profile');
    const id = rollOf(email);
    if (!p) return { id, role, email, name: '', profile: null, enrollment: null };
    const hostelId = String(p.hostel ?? '');
    return {
      id, role, email, name: p.name ?? '',
      profile: { name: p.name ?? '', gender: p.gender === 'Girls' ? 'Girls' : 'Boys', hostelId, room: String(p.room ?? ''), phone: String(p.phone ?? ''), admissionYear: Number(p.admissionYear) || undefined, semester: p.semester ? String(p.semester) : undefined },
      enrollment: { semesterId: 'current', hostelId, status: 'Active' },
    };
  },
  async saveProfile(x) {
    await rpc('register_student', { p_name: x.name, p_phone: x.phone, p_gender: x.gender, p_hostel_code: x.hostelId, p_room_number: x.room, p_admission_year: x.admissionYear ?? null });
    return supabaseApi.me();
  },
  async renewEnrollment(): Promise<never> { throw new ApiError('Renewal is not used: your semester follows your admission year.', 501); },
  async config() {
    const c = await rpc<J>('get_app_config');
    catIds = Object.fromEntries((c.categories as J[]).map((x) => [x.name, x.id]));
    const out: Config = {
      hostels: (c.hostels as J[]).map((h) => ({ id: h.code, name: h.name, group: h.gender === 'Girls' ? 'Girls' : 'Boys', days: [h.collection_day ?? 1, h.delivery_day ?? 5] as [number, number] })),
      categories: (c.categories as J[]).map((x) => ({ name: x.name, on: !!x.on, id: x.id })),
      conditions: c.conditions as string[],
      semesters: (c.semesters as J[]).map((s) => ({ id: String(s.id), name: `${s.name} · ${s.cohort_year} batch`, start: '', end: '', current: !!s.active })),
      enforceCounterHours: !!c.enforce_counter_hours, semestersReadOnly: true,
    };
    return out;
  },

  async listBatches(q) {
    const s = q?.search?.trim().toLowerCase();
    return (await rpc<J[]>('list_requests')).map(toBatch)
      .filter((b) => (!q?.status || q.status.includes(b.status)) && (!s || [b.rid, b.bid ?? '', b.studentId, b.studentName].some((v) => v.toLowerCase().includes(s))));
  },
  async getBatch(id) { return toBatch(await rpc('get_request', { p_id: num(id) })); },
  async submitRequest(items, remark) {
    if (!Object.keys(catIds).length) await supabaseApi.config();
    const list = Object.entries(items).filter(([, q]) => q > 0).map(([name, quantity]) => {
      if (!catIds[name]) throw new ApiError(`"${name}" can’t be submitted.`);
      return { category_id: catIds[name], quantity };
    });
    if (!list.length) throw new ApiError('Add at least one item.');
    const id = await rpc<number>('student_submit_request', { p_items: list, p_remarks: remark });
    return supabaseApi.getBatch(`LR-${id}`);
  },
  async verifyRequest(rid, v) { return toBatch(await rpc('staff_verify_request', { p_id: num(rid), p_items: v.items, p_conditions: v.conditions, p_remarks: v.remark })); },
  async rejectRequest(rid, reason) { return toBatch(await rpc('staff_reject_request', { p_id: num(rid), p_reason: reason })); },
  async generateBatchId(rid) { return toBatch(await rpc('staff_generate_batch_id', { p_id: num(rid) })); },
  async transition(rids, to) { return (await rpc<J[]>('staff_set_status', { p_ids: rids.map(num), p_to: to })).map(toBatch); },
  async sendDelayNotice(rid) { await rpc('staff_send_delay_notice', { p_id: num(rid) }); },
  async getPickup(rid) { return rpc('student_get_pickup', { p_id: num(rid) }); },
  async lookupPickup(code) {
    const r = await rpc<J>('staff_lookup_pickup', { p_code: code });
    return r.kind === 'invalid' ? { kind: 'invalid' } : { kind: r.kind, batch: toBatch(r.request) };
  },
  async confirmCollection(rid) { return toBatch(await rpc('staff_confirm_collection', { p_id: num(rid) })); },

  async listComplaints() { return (await rpc<J[]>('list_complaints')).map(toComplaint); },
  async getComplaint(id) { return toComplaint(await rpc('get_complaint', { p_id: num(id) })); },
  async createComplaint(i) { return toComplaint(await rpc('student_create_complaint', { p_laundry_id: num(i.batchId), p_type: i.type, p_description: i.description })); },
  async addComplaintNote(id, text) { return toComplaint(await rpc('complaint_add_note', { p_id: num(id), p_text: text })); },
  async advanceComplaint(id, note) { return toComplaint(await rpc('complaint_advance', { p_id: num(id), p_note: note ?? null })); },
  async escalateComplaint(id) { return toComplaint(await rpc('complaint_escalate', { p_id: num(id) })); },
  async sendBackComplaint(id) { return toComplaint(await rpc('complaint_send_back', { p_id: num(id) })); },

  async listNotifications(): Promise<Notification[]> { return (await rpc<J[]>('student_list_notifications')).map((n) => ({ id: String(n.id), title: n.title, body: n.body, at: n.at, read: !!n.read })); },
  async markAllRead() { await rpc('student_mark_notifications_read'); },

  async listStudents(search) { return (await rpc<J[]>('admin_list_students', { p_search: search ?? null })).map(toStudent); },
  async getStudent(id) { return toStudent(await rpc('admin_get_student', { p_roll: id })); },
  async changeHostel(id, hostelId) { return toStudent(await rpc('admin_change_hostel', { p_roll: id, p_hostel_code: hostelId })); },
  async setStudentActive(id, active) { return toStudent(await rpc('admin_set_student_active', { p_roll: id, p_active: active })); },
  async listStaff() { return (await rpc<J[]>('admin_list_staff')).map(toStaff); },
  async addStaff(i) { return toStaff(await rpc('admin_add_staff', { p_name: i.name, p_phone: i.phone, p_email: i.email, p_hostel_code: i.hostelId })); },
  async setStaffActive(id, active) { return toStaff(await rpc('admin_set_staff_active', { p_id: num(id), p_active: active })); },
  async addHostel(i) {
    const h = await rpc<J>('admin_add_hostel', { p_code: i.code, p_name: i.name, p_gender: i.group, p_collection_day: i.days[0], p_delivery_day: i.days[1] });
    return { id: h.code, name: h.name, group: i.group, days: i.days };
  },
  async setCounterEnforcement(on) { await rpc('admin_set_counter_enforcement', { p_on: on }); },
  async startSemester(): Promise<never> { throw new ApiError('Semesters follow each admission year and are managed in the database.', 501); },
  async approveRenewals(): Promise<never> { throw new ApiError('Renewals are not used.', 501); },
  async addCategory(name) { await rpc('admin_add_category', { p_name: name }); },
  async toggleCategory(name) { await rpc('admin_toggle_category', { p_name: name }); },
  async addCondition(name) { await rpc('admin_add_condition', { p_name: name }); },
  async removeCondition(name) { await rpc('admin_remove_condition', { p_name: name }); },
  async listAudit(q) {
    const rows = await rpc<J[]>('admin_list_audit', { p_search: q?.search ?? null, p_role: q?.role ?? null });
    return rows.map((e): AuditEntry => ({ id: String(e.id), at: e.at, batchId: e.batch, who: e.who, role: (e.role as Role) ?? 'staff', action: e.action, from: label(e.from), to: label(e.to) }));
  },
};
