/**
 * DEMO BACKEND — an in-memory implementation of the same `Api` interface the real HTTP client implements.
 * It follows the same rules the real backend must follow (state machine, role scoping, single-use pickup token),
 * so the whole student -> staff -> admin workflow can be demonstrated with no server at all.
 * Data resets when the page is reloaded.
 */
import {
  Api, ApiError, AuditEntry, Batch, Complaint, Condition, Config, Enrollment, EnrollmentStatus, Hostel, Items, LogEntry, Me,
  Notification, Pickup, Role, StaffRec, Status, StudentRec,
} from './types';
import { DEFAULT_CATEGORIES, DEFAULT_CONDITIONS, STATUS } from '../constants/domain';
import { did, pcs, rollOf } from '../lib/format';

export const DEMO_OTP = '123456';
export const DEMO_ACCOUNTS = [
  { role: 'Student', email: '24coe123@thapar.edu', login: '24coe123@thapar.edu' },
  { role: 'Staff', email: 'ramesh.kumar@thapar.edu', login: '9876500001' },
  { role: 'Admin', email: 'anjali.sharma@thapar.edu', login: '9876500000' },
];
const MOBILES: Record<string, string> = { 'anjali.sharma@thapar.edu': '9876500000', 'ramesh.kumar@thapar.edu': '9876500001' };

interface DbStudent extends StudentRec { room: string; gender: 'Boys' | 'Girls'; hasProfile: boolean }
interface Db {
  hostels: Hostel[]; semesters: Config['semesters']; categories: Config['categories']; conditions: string[];
  students: DbStudent[]; staff: StaffRec[]; batches: Batch[]; complaints: Complaint[];
  notifications: Record<string, Notification[]>; pickups: Record<string, Pickup>; audit: AuditEntry[];
}
const ADMIN = { id: 'AD1', name: 'Anjali Sharma', email: 'anjali.sharma@thapar.edu' };

/* ---------------------------------------------------------------- seed data */
const HOUR = 3600e3;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
let uidn = 0;
const uid = () => `${Date.now().toString(36)}${(uidn++).toString(36)}`;

const SCH: Record<string, [number, number]> = {
  B: [1, 5], H: [1, 5], O: [1, 5], F: [1, 5], I: [1, 5], Q: [1, 5],
  A: [2, 6], D: [2, 6], J: [2, 6], E: [2, 6], G: [2, 6], N: [2, 6],
  C: [3, 6], K: [3, 6], L: [3, 6], M: [3, 6], PG: [3, 6], PG2: [3, 6],
};
const BOYS = ['A', 'B', 'C', 'D', 'H', 'J', 'K', 'L', 'M', 'O'], GIRLS = ['E', 'F', 'G', 'I', 'N', 'Q', 'PG', 'PG2'];
const hostelName = (id: string) => (id === 'O' ? 'Hostel O (Vyom Hall)' : id.startsWith('PG') ? id : `Hostel ${id}`);

const En = (semesterId: string, hostelId: string, status: EnrollmentStatus = 'Ended'): Enrollment => ({ semesterId, hostelId, status });
const A = 'Active' as const;
const STUDENTS: [string, string, string, boolean, Enrollment[]][] = [
  ['24COE123', 'Devansh Dhawan', '00123', true, [En('S1-2526', 'O'), En('S2-2526', 'O'), En('S1-2627', 'O', A)]],
  ['24COE156', 'Aarav Mehta', '00156', true, [En('S2-2526', 'O'), En('S1-2627', 'O', A)]],
  ['24COE201', 'Kabir Singh', '00201', true, [En('S1-2627', 'O', A)]],
  ['24COE087', 'Rohan Gupta', '00087', true, [En('S2-2526', 'O'), En('S1-2627', 'O', A)]],
  ['24COE144', 'Ishita Verma', '00144', true, [En('S1-2627', 'O', A)]],
  ['24COE099', 'Meera Nair', '00099', true, [En('S1-2526', 'H'), En('S2-2526', 'H'), En('S1-2627', 'O', A)]],
  ['24COE178', 'Tanya Arora', '00178', true, [En('S2-2526', 'O'), En('S1-2627', 'O', A)]],
  ['24COE065', 'Nikhil Bansal', '00065', true, [En('S1-2627', 'O', A)]],
  ['24COE212', 'Sneha Kapoor', '00212', true, [En('S2-2526', 'O'), En('S1-2627', 'O', A)]],
  ['24COE301', 'Priya Malhotra', '00301', true, [En('S2-2526', 'A'), En('S1-2627', 'A', A)]],
  ['24COE322', 'Karan Joshi', '00322', true, [En('S2-2526', 'B'), En('S1-2627', 'B', A)]],
  ['24COE340', 'Simran Kaur', '00340', true, [En('S1-2627', 'H', A)]],
  ['24COE355', 'Yash Chawla', '00355', true, [En('S2-2526', 'J'), En('S1-2627', 'J', A)]],
  ['23COE310', 'Aditya Rao', '00310', false, [En('S1-2526', 'A'), En('S2-2526', 'A')]],
];
const STAFF: [string, string, string, string][] = [
  ['ST1', 'Ramesh Kumar', 'ramesh.kumar@thapar.edu', 'O'], ['ST2', 'Suresh Yadav', 'suresh.yadav@thapar.edu', 'O'],
  ['ST3', 'Sunita Devi', 'sunita.devi@thapar.edu', 'A'], ['ST4', 'Mohan Lal', 'mohan.lal@thapar.edu', 'B'],
  ['ST5', 'Pradeep Singh', 'pradeep.singh@thapar.edu', 'H'], ['ST6', 'Kavita Rani', 'kavita.rani@thapar.edu', 'J'],
];

// [number, student, hostel, status, days ago, pieces, days to return, delayed]
type Seed = [string, string, string, Status, number, number, number?, boolean?];
const W = 'WAITING_FOR_VERIFICATION', AT = 'AWAITING_TAGGING', TG = 'TAGGED', IL = 'IN_LAUNDRY', RT = 'RETURNED', RD = 'READY_FOR_PICKUP', CO = 'COLLECTED';
const BATCHES: Seed[] = [
  ['1046', '24COE087', 'O', W, 0, 3], ['1045', '24COE201', 'O', W, 0, 9], ['1044', '24COE156', 'O', W, 0, 7],
  ['1043', '24COE144', 'O', AT, 0, 5], ['1041', '24COE099', 'O', TG, 1, 4], ['1042', '24COE123', 'O', IL, 2, 8],
  ['1040', '24COE178', 'O', IL, 5, 5, undefined, true], ['1039', '24COE065', 'O', RT, 4, 5, 4], ['1038', '24COE123', 'O', RD, 6, 3, 5],
  ['1037', '24COE212', 'O', RD, 3, 6, 3], ['1021', '24COE123', 'O', CO, 20, 6, 5], ['0996', '24COE123', 'O', CO, 28, 5, 5],
  ['1019', '24COE156', 'O', CO, 12, 5, 5], ['1018', '24COE087', 'O', CO, 15, 7, 6], ['1017', '24COE178', 'O', CO, 18, 6, 4],
  ['1036', '24COE301', 'A', IL, 2, 6], ['1033', '23COE310', 'A', CO, 8, 4, 3], ['1029', '24COE301', 'A', CO, 13, 7, 4],
  ['1024', '23COE310', 'A', CO, 19, 5, 4], ['1035', '24COE322', 'B', RD, 3, 5, 5], ['1032', '24COE322', 'B', CO, 9, 8, 6],
  ['1028', '24COE322', 'B', CO, 14, 3, 5], ['1022', '24COE322', 'B', CO, 21, 6, 7], ['1034', '24COE340', 'H', IL, 6, 7, undefined, true],
  ['1031', '24COE340', 'H', CO, 10, 5, 4], ['1027', '24COE340', 'H', CO, 16, 6, 5], ['1023', '24COE340', 'H', CO, 22, 4, 4],
  ['1030', '24COE355', 'J', RT, 4, 4, 3], ['1026', '24COE355', 'J', CO, 11, 9, 3], ['1025', '24COE355', 'J', CO, 17, 5, 4],
  ['1020', '24COE355', 'J', CO, 24, 6, 3],
];
const DETAIL: Record<string, { items?: Items; original?: Items; conds?: Condition[]; remark?: string; code?: string; cmp?: string }> = {
  '1046': { items: { Bedsheet: 1, Towel: 2 } },
  '1045': { items: { Shirts: 3, 'T-Shirts': 4, 'Jeans / Pants': 2 } },
  '1044': { items: { Shirts: 2, 'T-Shirts': 3, 'Jeans / Pants': 2 }, remark: 'Small tear on one shirt collar' },
  '1043': { items: { Shirts: 4, 'Jeans / Pants': 1 }, conds: [{ c: 'Shirts', k: 'Faded color' }] },
  '1041': { items: { Towel: 3, Bedsheet: 1 } },
  '1042': { items: { Shirts: 2, 'T-Shirts': 4, 'Jeans / Pants': 2 }, original: { Shirts: 3, 'T-Shirts': 4, 'Jeans / Pants': 2 }, conds: [{ c: 'Shirts', k: 'Small tear' }] },
  '1040': { items: { Shirts: 5 } },
  '1039': { items: { 'Jeans / Pants': 3, 'T-Shirts': 2 } },
  '1038': { items: { Bedsheet: 1, Towel: 2 }, code: '482915' },
  '1037': { items: { Shirts: 6 }, conds: [{ c: 'Shirts', k: 'Stain' }], remark: 'Ink stain on one shirt, existing', code: '731064' },
  '1021': { items: { Shirts: 2, 'Jeans / Pants': 3, Towel: 1 }, cmp: 'C-14' },
  '0996': { items: { 'T-Shirts': 5 }, cmp: 'C-12' },
  '1032': { cmp: 'C-15' }, '1029': { cmp: 'C-11' }, '1027': { cmp: 'C-10' },
};
const ORDER: Status[] = [W, AT, TG, IL, RT, RD, CO];
const nextDow = (dow: number, from = new Date()) => {
  const gap = ((dow - from.getDay() + 7) % 7) || 7;
  const d = new Date(from.getTime() + gap * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const lab = (s: Status) => STATUS[s][0];

function buildDb(): Db {
  const hostels: Hostel[] = [
    ...BOYS.map((id): Hostel => ({ id, name: hostelName(id), group: 'Boys', days: SCH[id] })),
    ...GIRLS.map((id): Hostel => ({ id, name: hostelName(id), group: 'Girls', days: SCH[id] })),
  ];
  const students: DbStudent[] = STUDENTS.map(([id, name, ph, active, enrollments], i) => {
    const cur = enrollments[enrollments.length - 1];
    return {
      id, name, phone: '90000' + ph, email: id.toLowerCase() + '@thapar.edu', active, enrollments,
      room: String(200 + i * 7), gender: hostels.find((h) => h.id === cur.hostelId)!.group, hasProfile: true,
    };
  });
  const staff: StaffRec[] = STAFF.map(([id, name, email, hostelId]) => ({ id, name, email, hostelId, active: true }));
  const staffOf = (h: string) => staff.find((s) => s.hostelId === h)?.name ?? 'Counter staff';

  const pickups: Record<string, Pickup> = {};
  const batches: Batch[] = BATCHES.map(([n, stu, h, st, d, count, tat, late]) => {
    const det = DETAIL[n] ?? {};
    const items: Items = det.items ?? { Shirts: Math.ceil(count / 2), ...(count > 1 ? { 'T-Shirts': Math.floor(count / 2) } : {}) };
    const original = st === W ? items : det.original ?? items;
    const s = students.find((x) => x.id === stu)!;
    const t0 = Date.now() - (d * 24 + (d === 0 ? 1 + (+n % 3) : 3 + (+n % 5))) * HOUR;
    const at = (hoursAfter: number) => new Date(Math.min(t0 + hoursAfter * HOUR, Date.now() - 0.2 * HOUR)).toISOString();
    const i = ORDER.indexOf(st), who = staffOf(h);
    const changed = Object.keys({ ...original, ...items }).filter((k) => (original[k] ?? 0) !== (items[k] ?? 0));
    const hasBid = i >= 2 || (st === AT && false);
    const b: Batch = {
      rid: `LR-${n}`, bid: hasBid ? `L-${n}` : null, studentId: stu, studentName: s.name, hostelId: h, room: s.room,
      semesterId: 'S1-2627', status: st, late, submittedAt: at(0), expectedOn: nextDow(SCH[h][1], new Date(t0)),
      items, original, conditions: det.conds ?? [], remark: det.remark ?? '', log: [], complaintId: det.cmp ?? null,
      returnedAt: i >= 4 && tat ? at(tat * 24) : null,
    };
    const L = (hoursAfter: number, w: string, role: Role, a: string, from?: Status, to?: Status): LogEntry =>
      ({ t: at(hoursAfter), who: w, role, a, from: from && lab(from), to: to && lab(to) });
    b.log.push(L(0, s.name, 'student', 'Submitted request', undefined, W));
    if (i >= 1) b.log.push(L(0.3, who, 'staff', changed.length ? `Verified. Changed ${changed.map((k) => `${k} ${original[k] ?? 0} to ${items[k] ?? 0}`).join(', ')}` : 'Verified physical count, no changes', W, AT));
    if (b.bid) b.log.push(L(0.4, who, 'staff', `Generated batch ID ${b.bid}`));
    if (i >= 2) b.log.push(L(0.5, who, 'staff', 'Tag applied', AT, TG));
    if (i >= 3) b.log.push(L(0.6, who, 'staff', 'Sent to laundry', TG, IL));
    if (i >= 4) b.log.push({ t: b.returnedAt ?? at(24), who, role: 'staff', a: 'Marked returned', from: lab(IL), to: lab(RT) });
    if (i >= 5) {
      b.log.push(L(24 * (tat ?? 3), who, 'staff', 'Marked ready for pickup. QR activated', RT, RD));
      pickups[b.rid] = { token: uid() + uid(), code: det.code ?? String(100000 + ((+n * 7919) % 900000)), used: st === CO };
      b.tokenActive = st === RD; b.tokenUsed = st === CO;
    }
    if (i >= 6) b.log.push(L(24 * (tat ?? 3) + 1, who, 'staff', 'Collection confirmed. QR token used', RD, CO));
    return b;
  });

  const n = (t: number, w: string, role: Role, a: string): LogEntry => ({ t: ago(t), who: w, role, a });
  const complaints: Complaint[] = [
    { id: 'C-15', batchId: 'L-1032', studentId: '24COE322', studentName: 'Karan Joshi', hostelId: 'B', type: 'Wrong item', status: 'Under review', escalated: true, filedAt: ago(72), description: 'One shirt in my bag is not mine. It is a white shirt with a different brand.',
      notes: [n(71, 'Mohan Lal', 'staff', 'Checked the racks and the register. Count matches at pickup, so the item may have been swapped with another student’s. Cannot resolve at the counter.'), n(70.9, 'Mohan Lal', 'staff', 'Escalated to admin')] },
    { id: 'C-14', batchId: 'L-1021', studentId: '24COE123', studentName: 'Devansh Dhawan', hostelId: 'O', type: 'Damaged', status: 'Open', escalated: false, filedAt: ago(2), description: 'Towel came back with a tear along one edge.', notes: [] },
    { id: 'C-12', batchId: 'L-0996', studentId: '24COE123', studentName: 'Devansh Dhawan', hostelId: 'O', type: 'Missing', status: 'Investigating', escalated: false, filedAt: ago(24 * 82), description: '1 T-shirt missing from the batch. I submitted 5 and received 4.',
      notes: [n(24 * 81.5, 'Ramesh Kumar', 'staff', 'Checked the register. Count at verification was 5. Searching the returned racks.')] },
    { id: 'C-11', batchId: 'L-1029', studentId: '24COE301', studentName: 'Priya Malhotra', hostelId: 'A', type: 'Delay', status: 'Resolved', escalated: false, filedAt: ago(24 * 6), description: 'My laundry was due on 20 Oct and is still not returned.',
      notes: [n(24 * 5, 'Sunita Devi', 'staff', 'Batch was held up by a machine fault. Returned the same day and student informed.')] },
    { id: 'C-10', batchId: 'L-1027', studentId: '24COE340', studentName: 'Simran Kaur', hostelId: 'H', type: 'Incorrect quantity', status: 'Closed', escalated: false, filedAt: ago(24 * 17), description: 'The slip said 6 pieces but I only got 5.',
      notes: [n(24 * 17, 'Pradeep Singh', 'staff', 'Verified count was 6. Found the sixth piece in another bag and handed it over.'), n(24 * 16, ADMIN.name, 'admin', 'Student confirmed all items received. Closing.')] },
  ];
  const audit: AuditEntry[] = batches.flatMap((b) => b.log.map((e) => ({ id: uid(), at: e.t, batchId: did(b), who: e.who, role: e.role ?? 'staff', action: e.a, from: e.from, to: e.to })));
  complaints.forEach((c) => {
    audit.push({ id: uid(), at: c.filedAt, batchId: c.batchId, who: c.studentName, role: 'student', action: `Complaint ${c.id} filed: ${c.type}` });
    c.notes.forEach((x) => audit.push({ id: uid(), at: x.t, batchId: c.batchId, who: x.who, role: x.role ?? 'staff', action: `Complaint ${c.id}: ${x.a.slice(0, 60)}` }));
  });
  audit.push(
    { id: uid(), at: ago(24 * 5), batchId: '', who: ADMIN.name, role: 'admin', action: 'Added staff Kavita Rani (Hostel J)' },
    { id: uid(), at: ago(24 * 7), batchId: '', who: ADMIN.name, role: 'admin', action: 'Deactivated student 23COE310 (left college)' },
  );
  audit.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const nt = (title: string, body: string, h: number, read: boolean): Notification => ({ id: uid(), title, body, at: ago(h), read });
  return {
    hostels,
    semesters: [
      { id: 'S1-2627', name: '2026-27 Sem 1', start: '2026-07-20', end: '2026-12-20', current: true },
      { id: 'S2-2526', name: '2025-26 Sem 2', start: '2026-01-12', end: '2026-06-20', current: false },
      { id: 'S1-2526', name: '2025-26 Sem 1', start: '2025-07-21', end: '2025-12-20', current: false },
    ],
    categories: DEFAULT_CATEGORIES.map((name) => ({ name, on: true })),
    conditions: [...DEFAULT_CONDITIONS],
    students, staff, batches, complaints, pickups, audit,
    notifications: {
      '24COE123': [
        nt('Laundry ready for pickup', 'Batch L-1038 is ready at the counter', 20, false),
        nt('Laundry processing started', 'Batch L-1042 entered the wash cycle', 48, false),
        nt('Complaint update', 'Your complaint on L-0996 is being investigated', 24 * 80, true),
      ],
    },
  };
}
let db = buildDb();

/* ---------------------------------------------------------------- helpers */
const wait = () => new Promise((r) => setTimeout(r, 140));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const call = async <T,>(f: () => T): Promise<T> => { await wait(); return clone(f()); };
const curSem = () => db.semesters.find((s) => s.current)!;
const hName = (id: string) => db.hostels.find((h) => h.id === id)?.name ?? id;
const curEnr = (s: StudentRec) => s.enrollments.find((e) => e.status === 'Active') ?? s.enrollments.find((e) => e.status === 'Pending renewal') ?? s.enrollments[s.enrollments.length - 1];

let session: string | null = null;
interface Cur { role: Role; id: string; name: string; email: string; hostelId?: string }
function user(): Cur {
  const e = session?.toLowerCase();
  if (!e) throw new ApiError('Not signed in', 401);
  if (e === ADMIN.email) return { role: 'admin', ...ADMIN };
  const st = db.staff.find((s) => s.email === e);
  if (st) { if (!st.active) throw new ApiError('Account deactivated', 403); return { role: 'staff', id: st.id, name: st.name, email: st.email, hostelId: st.hostelId }; }
  const s = db.students.find((x) => x.email === e);
  if (!s) throw new ApiError('Not signed in', 401);
  if (!s.active) throw new ApiError('Account deactivated', 403);
  return { role: 'student', id: s.id, name: s.name, email: s.email };
}
const need = (...roles: Role[]) => { const u = user(); if (!roles.includes(u.role)) throw new ApiError('You do not have permission to do this', 403); return u; };
const myStudent = () => { const u = need('student'); return db.students.find((s) => s.id === u.id)!; };

function canSee(u: Cur, hostelId: string, studentId: string) {
  return u.role === 'admin' || (u.role === 'staff' && u.hostelId === hostelId) || (u.role === 'student' && u.id === studentId);
}
function findBatch(id: string): Batch {
  const u = user();
  const b = db.batches.find((x) => x.rid === id || x.bid === id);
  if (!b || !canSee(u, b.hostelId, b.studentId)) throw new ApiError('Laundry not found', 404);
  return b;
}
function staffBatch(id: string, from: Status): Batch {
  const u = need('staff');
  const b = findBatch(id);
  if (u.hostelId !== b.hostelId) throw new ApiError('This batch belongs to another counter', 403);
  if (b.status !== from) throw new ApiError(`Not allowed: this laundry is ${lab(b.status).toLowerCase()}`, 409);
  return b;
}
function act(b: Batch, a: string, from?: Status, to?: Status) {
  const u = user(), at = new Date().toISOString();
  const e: LogEntry = { t: at, who: u.name, role: u.role, a, from: from && lab(from), to: to && lab(to) };
  b.log.push(e);
  db.audit.unshift({ id: uid(), at, batchId: did(b), who: u.name, role: u.role, action: a, from: e.from, to: e.to });
}
function audit(batchId: string, action: string, from?: string, to?: string) {
  const u = user();
  db.audit.unshift({ id: uid(), at: new Date().toISOString(), batchId, who: u.name, role: u.role, action, from, to });
}
function notify(studentId: string, title: string, body: string) {
  (db.notifications[studentId] ??= []).unshift({ id: uid(), title, body, at: new Date().toISOString(), read: false });
}
const nextNum = (ids: (string | null)[], re: RegExp) => Math.max(0, ...ids.map((x) => +(x?.match(re)?.[1] ?? 0))) + 1;
const pad4 = (n: number) => String(n).padStart(4, '0');

function toMe(): Me {
  const u = user();
  if (u.role !== 'student') return { id: u.id, role: u.role, email: u.email, name: u.name, hostelId: u.hostelId };
  const s = db.students.find((x) => x.id === u.id)!, e = curEnr(s);
  return {
    id: s.id, role: 'student', email: s.email, name: s.name,
    profile: s.hasProfile && e ? { name: s.name, gender: s.gender, hostelId: e.hostelId, room: s.room, phone: s.phone } : null,
    enrollment: e ? { ...e } : null,
  };
}
function moveStudent(s: DbStudent, hostelId: string) {
  const e = s.enrollments.find((x) => x.status === 'Active');
  const from = e?.hostelId;
  if (e) e.status = 'Ended';
  s.enrollments.push({ semesterId: curSem().id, hostelId, status: 'Active' });
  s.gender = db.hostels.find((h) => h.id === hostelId)!.group;
  audit('', `Changed hostel for ${s.id} (${s.name})`, from ? hName(from) : '', hName(hostelId));
}
function getComplaint(id: string): Complaint {
  const u = user();
  const c = db.complaints.find((x) => x.id === id);
  if (!c || !canSee(u, c.hostelId, c.studentId)) throw new ApiError('Complaint not found', 404);
  return c;
}
const CS: Complaint['status'][] = ['Open', 'Under review', 'Investigating', 'Resolved', 'Closed'];

/* ---------------------------------------------------------------- the API */
export const mockApi: Api = {
  setSession(token) { session = token; },
  auth: {
    async sendOtp(identifier) {
      await wait();
      let email = identifier.trim().toLowerCase();
      if (!email.includes('@')) {
        const hit = Object.entries(MOBILES).find(([, m]) => m === email.replace(/\D/g, '').slice(-10));
        if (!hit) throw new ApiError('This mobile number is not registered as staff. Ask the admin to add you.');
        email = hit[0];
      }
      if (!email.endsWith('@thapar.edu')) throw new ApiError('Please use your college email (@thapar.edu).');
      return email;
    },
    async verifyOtp(email, code) {
      await wait();
      const e = email.toLowerCase();
      if (code !== DEMO_OTP) throw new ApiError('Incorrect OTP. Authentication rejected.', 401);
      if (!e.endsWith('@thapar.edu')) throw new ApiError('Please use your college email (@thapar.edu).');
      const isStaff = e === ADMIN.email || db.staff.some((s) => s.email === e);
      if (!isStaff && !db.students.some((s) => s.email === e)) {
        db.students.push({ id: rollOf(e), name: '', phone: '', email: e, active: true, enrollments: [], room: '', gender: 'Boys', hasProfile: false });
      }
      session = e;
      return { token: e, me: clone(toMe()) };
    },
  },
  me: () => call(() => toMe()),
  saveProfile: (p) => call(() => {
    const s = myStudent();
    if (!p.name.trim()) throw new ApiError('Please enter your name.');
    const h = db.hostels.find((x) => x.id === p.hostelId);
    if (!h) throw new ApiError('Please choose your hostel.');
    if (!/^[A-Za-z0-9\-/ ]{1,8}$/.test(p.room.trim())) throw new ApiError('Please enter a valid room number.');
    if (!/^\d{10}$/.test(p.phone.trim())) throw new ApiError('Mobile number must be 10 digits.');
    const e = curEnr(s);
    s.name = p.name.trim(); s.room = p.room.trim(); s.phone = p.phone.trim(); s.hasProfile = true;
    if (!e) { s.enrollments.push({ semesterId: curSem().id, hostelId: h.id, status: 'Active' }); s.gender = h.group; }
    else if (e.hostelId !== h.id) moveStudent(s, h.id);
    return toMe();
  }),
  renewEnrollment: () => call(() => {
    const s = myStudent(), e = s.enrollments.find((x) => x.status === 'Pending renewal');
    if (!e) throw new ApiError('Nothing to renew');
    e.status = 'Active';
    audit('', `Renewed enrollment for ${s.id} (${s.name})`);
    return toMe();
  }),
  config: () => call(() => ({ hostels: db.hostels, semesters: db.semesters, categories: db.categories, conditions: db.conditions })),

  listBatches: (q) => call(() => {
    const u = user(), s = q?.search?.trim().toLowerCase();
    return db.batches
      .filter((b) => canSee(u, b.hostelId, b.studentId))
      .filter((b) => !q?.status || q.status.includes(b.status))
      .filter((b) => !s || [b.rid, b.bid ?? '', b.studentId, b.studentName].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  }),
  getBatch: (id) => call(() => findBatch(id)),
  submitRequest: (items, remark) => call(() => {
    const s = myStudent(), e = curEnr(s);
    if (!e || e.status !== 'Active') throw new ApiError('Renew your hostel for this semester before submitting laundry.', 409);
    const clean: Items = {};
    for (const [k, v] of Object.entries(items)) {
      if (v > 0) {
        if (!db.categories.some((c) => c.name === k && c.on)) throw new ApiError(`"${k}" is not an accepted category`);
        clean[k] = Math.floor(v);
      }
    }
    if (!pcs(clean)) throw new ApiError('Add at least one item.');
    const n = nextNum(db.batches.map((b) => b.rid), /^LR-(\d+)$/);
    const h = db.hostels.find((x) => x.id === e.hostelId)!;
    const b: Batch = {
      rid: `LR-${pad4(n)}`, bid: null, studentId: s.id, studentName: s.name, hostelId: h.id, room: s.room, semesterId: e.semesterId,
      status: 'WAITING_FOR_VERIFICATION', submittedAt: new Date().toISOString(), expectedOn: nextDow(h.days[1]),
      items: clean, original: { ...clean }, conditions: [], remark: remark.trim(), log: [],
    };
    db.batches.unshift(b);
    act(b, 'Submitted request', undefined, 'WAITING_FOR_VERIFICATION');
    notify(s.id, 'Request submitted', `Request ${b.rid} is waiting for staff verification`);
    return b;
  }),
  verifyRequest: (rid, v) => call(() => {
    const b = staffBatch(rid, 'WAITING_FOR_VERIFICATION');
    const items: Items = {};
    for (const [k, n] of Object.entries(v.items)) if (n > 0) items[k] = n;
    if (!pcs(items)) throw new ApiError('Approve at least one piece, or reject the request.');
    const changed = Object.keys({ ...b.original, ...items }).filter((k) => (b.original[k] ?? 0) !== (items[k] ?? 0));
    b.items = items; b.conditions = v.conditions; b.remark = v.remark.trim();
    b.status = 'AWAITING_TAGGING';
    act(b, changed.length ? `Verified. Changed ${changed.map((k) => `${k} ${b.original[k] ?? 0} to ${items[k] ?? 0}`).join(', ')}` : 'Verified physical count, no changes', 'WAITING_FOR_VERIFICATION', 'AWAITING_TAGGING');
    changed.forEach((k) => audit(did(b), 'Changed student’s entry at verification', `${k} ${b.original[k] ?? 0}`, `${k} ${items[k] ?? 0}`));
    if (v.conditions.length) act(b, 'Noted: ' + v.conditions.map((x) => `${x.c} ${x.k.toLowerCase()}`).join(', '));
    notify(b.studentId, changed.length ? 'Request modified at verification' : 'Verification completed', `${b.rid} verified: ${pcs(items)} pieces${changed.length ? ' (count differed from your entry)' : ''}`);
    return b;
  }),
  rejectRequest: (rid, reason) => call(() => {
    const b = staffBatch(rid, 'WAITING_FOR_VERIFICATION');
    b.status = 'CANCELLED';
    act(b, 'Rejected at verification: ' + reason, 'WAITING_FOR_VERIFICATION', 'CANCELLED');
    notify(b.studentId, 'Request rejected', `${b.rid} was rejected: ${reason}`);
    return b;
  }),
  generateBatchId: (rid) => call(() => {
    const b = staffBatch(rid, 'AWAITING_TAGGING');
    if (b.bid) return b;
    b.bid = `L-${pad4(nextNum(db.batches.map((x) => x.bid), /^L-(\d+)$/))}`;
    act(b, `Generated batch ID ${b.bid}`);
    return b;
  }),
  transition: (rids, to) => call(() => {
    const from: Record<typeof to, Status> = { TAGGED: 'AWAITING_TAGGING', IN_LAUNDRY: 'TAGGED', RETURNED: 'IN_LAUNDRY', READY_FOR_PICKUP: 'RETURNED' };
    return rids.map((rid) => {
      const b = staffBatch(rid, from[to]);
      if (to === 'TAGGED' && !b.bid) throw new ApiError('Generate the batch ID first.', 409);
      b.status = to;
      const msg = { TAGGED: 'Tag applied', IN_LAUNDRY: 'Sent to laundry', RETURNED: 'Marked returned', READY_FOR_PICKUP: 'Marked ready for pickup. QR activated' }[to];
      act(b, msg, from[to], to);
      if (to === 'RETURNED') { b.late = false; b.returnedAt = new Date().toISOString(); notify(b.studentId, 'Laundry returned', `${did(b)} is back from the laundry`); }
      if (to === 'IN_LAUNDRY') notify(b.studentId, 'Laundry processing started', `Batch ${did(b)} entered the wash cycle`);
      if (to === 'READY_FOR_PICKUP') {
        let code = '';
        do code = String(100000 + Math.floor(Math.random() * 900000)); while (Object.values(db.pickups).some((p) => p.code === code));
        db.pickups[b.rid] = { token: uid() + uid(), code, used: false };
        b.tokenActive = true; b.tokenUsed = false;
        notify(b.studentId, 'Laundry ready for pickup', `Batch ${did(b)} is ready at the counter`);
      }
      return b;
    });
  }),
  sendDelayNotice: (rid) => call(() => {
    const u = need('staff'), b = findBatch(rid);
    if (u.hostelId !== b.hostelId) throw new ApiError('This batch belongs to another counter', 403);
    act(b, 'Delay notice sent to student');
    notify(b.studentId, 'Laundry delayed', `Batch ${did(b)} is taking longer than expected`);
  }),
  getPickup: (id) => call(() => {
    const u = need('student'), b = findBatch(id);
    if (b.studentId !== u.id) throw new ApiError('Laundry not found', 404);
    return db.pickups[b.rid] ?? null;
  }),
  lookupPickup: (raw) => call(() => {
    const u = need('staff');
    const k = raw.replace(/\s/g, '').replace(/^hlp:/, '');
    const hit = Object.entries(db.pickups).find(([, p]) => p.code === k || p.token === k);
    const b = hit && db.batches.find((x) => x.rid === hit[0]);
    if (!b || b.hostelId !== u.hostelId) return { kind: 'invalid' as const };
    if (b.status === 'COLLECTED' || hit![1].used) return { kind: 'used' as const, batch: b };
    if (b.status !== 'READY_FOR_PICKUP') return { kind: 'invalid' as const };
    return { kind: 'ok' as const, batch: b };
  }),
  confirmCollection: (rid) => call(() => {
    const b = findBatch(rid);
    if (b.status === 'COLLECTED') throw new ApiError('Token already used', 409);
    staffBatch(rid, 'READY_FOR_PICKUP');
    b.status = 'COLLECTED'; b.tokenActive = false; b.tokenUsed = true;
    const p = db.pickups[b.rid]; if (p) p.used = true;
    act(b, 'Collection confirmed. QR token used', 'READY_FOR_PICKUP', 'COLLECTED');
    notify(b.studentId, 'Collection completed', `Batch ${did(b)} was collected`);
    return b;
  }),

  listComplaints: () => call(() => {
    const u = user();
    return db.complaints.filter((c) => canSee(u, c.hostelId, c.studentId)).sort((a, b) => +new Date(b.filedAt) - +new Date(a.filedAt));
  }),
  getComplaint: (id) => call(() => getComplaint(id)),
  createComplaint: (i) => call(() => {
    const s = myStudent(), b = findBatch(i.batchId);
    if (b.studentId !== s.id) throw new ApiError('Laundry not found', 404);
    if (!i.description.trim()) throw new ApiError('Please describe the issue.');
    const c: Complaint = {
      id: `C-${nextNum(db.complaints.map((x) => x.id), /^C-(\d+)$/)}`, batchId: did(b), studentId: s.id, studentName: s.name, hostelId: b.hostelId,
      type: i.type, status: 'Open', escalated: false, filedAt: new Date().toISOString(), description: i.description.trim(), notes: [],
    };
    db.complaints.unshift(c); b.complaintId = c.id;
    act(b, `Complaint ${c.id} filed: ${i.type}`);
    notify(s.id, 'Complaint submitted', `${c.id} linked to Batch ${did(b)}`);
    return c;
  }),
  addComplaintNote: (id, text) => call(() => {
    const u = need('staff', 'admin'), c = getComplaint(id);
    if (!text.trim()) throw new ApiError('Write a note first.');
    c.notes.push({ t: new Date().toISOString(), who: u.name, role: u.role, a: text.trim() });
    return c;
  }),
  advanceComplaint: (id, note) => call(() => {
    const u = need('staff', 'admin'), c = getComplaint(id), i = CS.indexOf(c.status);
    if (i >= 4) throw new ApiError('This complaint is already closed.', 409);
    if (i === 2 && !c.notes.length && !note?.trim()) throw new ApiError('Add a resolution note first.');
    if (note?.trim()) c.notes.push({ t: new Date().toISOString(), who: u.name, role: u.role, a: note.trim() });
    const from = c.status; c.status = CS[i + 1];
    const b = db.batches.find((x) => did(x) === c.batchId);
    if (b) act(b, `Complaint ${c.id} moved to ${c.status}`); else audit(c.batchId, `Complaint ${c.id} moved to ${c.status}`, from, c.status);
    notify(c.studentId, 'Complaint update', `${c.id} is now ${c.status.toLowerCase()}`);
    return c;
  }),
  escalateComplaint: (id) => call(() => {
    const u = need('staff'), c = getComplaint(id);
    c.escalated = true;
    c.notes.push({ t: new Date().toISOString(), who: u.name, role: 'staff', a: 'Escalated to admin' });
    audit(c.batchId, `Escalated complaint ${c.id} to admin`);
    return c;
  }),
  sendBackComplaint: (id) => call(() => {
    const u = need('admin'), c = getComplaint(id);
    c.escalated = false;
    c.notes.push({ t: new Date().toISOString(), who: u.name, role: 'admin', a: 'Sent back to staff for follow-up' });
    audit(c.batchId, `Complaint ${c.id} sent back to staff`);
    return c;
  }),

  listNotifications: () => call(() => (db.notifications[need('student').id] ?? [])),
  markAllRead: () => call(() => { (db.notifications[need('student').id] ?? []).forEach((n) => { n.read = true; }); }),

  listStudents: (q) => call(() => {
    need('admin');
    const s = q?.trim().toLowerCase();
    return db.students.filter((x) => x.hasProfile || x.enrollments.length).filter((x) => !s || [x.id, x.name, x.phone].some((v) => v.toLowerCase().includes(s)));
  }),
  getStudent: (id) => call(() => { need('admin'); const s = db.students.find((x) => x.id === id); if (!s) throw new ApiError('Student not found', 404); return s; }),
  changeHostel: (id, hostelId) => call(() => {
    need('admin');
    const s = db.students.find((x) => x.id === id);
    if (!s || !s.active) throw new ApiError('Student not found or inactive', 404);
    if (!db.hostels.some((h) => h.id === hostelId)) throw new ApiError('Unknown hostel');
    moveStudent(s, hostelId);
    return s;
  }),
  setStudentActive: (id, active) => call(() => {
    need('admin');
    const s = db.students.find((x) => x.id === id);
    if (!s) throw new ApiError('Student not found', 404);
    s.active = active;
    if (!active) s.enrollments.forEach((e) => { e.status = 'Ended'; });
    else s.enrollments.push({ semesterId: curSem().id, hostelId: s.enrollments[s.enrollments.length - 1]?.hostelId ?? db.hostels[0].id, status: 'Active' });
    audit('', `${active ? 'Reactivated' : 'Deactivated'} student ${s.id} (${s.name})`);
    return s;
  }),
  listStaff: () => call(() => { need('admin'); return db.staff; }),
  addStaff: (i) => call(() => {
    need('admin');
    const email = i.email.trim().toLowerCase();
    if (!i.name.trim()) throw new ApiError('Enter the staff member’s name.');
    if (!email.endsWith('@thapar.edu')) throw new ApiError('Use a college email (@thapar.edu).');
    if (db.staff.some((m) => m.email === email)) throw new ApiError('A staff account with this email already exists.');
    const m: StaffRec = { id: 'ST' + (db.staff.length + 1), name: i.name.trim(), email, phone: i.phone, hostelId: i.hostelId, active: true };
    db.staff.push(m);
    audit('', `Added staff ${m.name} (${hName(m.hostelId)})`);
    return m;
  }),
  setStaffActive: (id, active) => call(() => {
    need('admin');
    const m = db.staff.find((x) => x.id === id);
    if (!m) throw new ApiError('Staff member not found', 404);
    m.active = active;
    audit('', `${active ? 'Reactivated' : 'Deactivated'} staff ${m.name} (${hName(m.hostelId)})`);
    return m;
  }),
  setCounterEnforcement: () => call(() => undefined),
  addHostel: (i) => call(() => {
    need('admin');
    const name = i.name.trim();
    if (!name) throw new ApiError('Hostel name is required.');
    if (db.hostels.some((h) => h.name.toLowerCase() === name.toLowerCase())) throw new ApiError('Hostel already exists.');
    const h: Hostel = { id: i.code.trim().toUpperCase() || 'H' + Date.now(), name, group: i.group, days: i.days };
    db.hostels.push(h);
    audit('', 'Added hostel ' + name);
    return h;
  }),
  startSemester: (i) => call(() => {
    need('admin');
    const name = i.name.trim();
    if (!name || !i.start || !i.end) throw new ApiError('Enter a name, start date and end date.');
    if (i.end <= i.start) throw new ApiError('The end date must be after the start date.');
    if (db.semesters.some((m) => m.name.toLowerCase() === name.toLowerCase())) throw new ApiError('A semester with this name already exists.');
    const old = curSem(), id = 'S-' + Date.now();
    old.current = false;
    db.semesters.unshift({ id, name, start: i.start, end: i.end, current: true });
    let pending = 0;
    db.students.filter((s) => s.active).forEach((s) => {
      const e = curEnr(s); if (!e) return;
      e.status = 'Ended'; s.enrollments.push({ semesterId: id, hostelId: e.hostelId, status: 'Pending renewal' }); pending++;
    });
    audit('', `Started semester ${name}. ${pending} students pending renewal`, old.name, name);
    return { pending };
  }),
  approveRenewals: () => call(() => {
    need('admin');
    let n = 0;
    db.students.forEach((s) => s.enrollments.forEach((e) => { if (e.status === 'Pending renewal') { e.status = 'Active'; n++; } }));
    audit('', `Approved ${n} semester renewals`);
    return n;
  }),
  addCategory: (name) => call(() => {
    need('admin');
    const n = name.trim();
    if (!n) throw new ApiError('Category name is required.');
    if (db.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) throw new ApiError('Category already exists.');
    db.categories.push({ name: n, on: true });
    audit('', 'Added clothing category ' + n);
  }),
  toggleCategory: (name) => call(() => {
    need('admin');
    const c = db.categories.find((x) => x.name === name);
    if (!c) throw new ApiError('Category not found', 404);
    c.on = !c.on;
    audit('', `${c.on ? 'Restored' : 'Retired'} clothing category ${c.name}`);
  }),
  addCondition: (name) => call(() => {
    need('admin');
    const n = name.trim();
    if (!n) throw new ApiError('Condition name is required.');
    if (db.conditions.some((c) => c.toLowerCase() === n.toLowerCase())) throw new ApiError('Condition already exists.');
    db.conditions.push(n);
    audit('', 'Added condition option ' + n);
  }),
  removeCondition: (name) => call(() => {
    need('admin');
    db.conditions = db.conditions.filter((c) => c !== name);
    audit('', 'Removed condition option ' + name);
  }),
  listAudit: (q) => call(() => {
    need('admin');
    const s = q?.search?.trim().toLowerCase();
    const byStudent = s ? new Set(db.batches.filter((b) => b.studentId.toLowerCase() === s).map(did)) : null;
    return db.audit
      .filter((e) => !s || [e.batchId, e.who, e.action].some((x) => x.toLowerCase().includes(s)) || byStudent?.has(e.batchId))
      .filter((e) => !q?.role || q.role === 'All' || e.role === q.role.toLowerCase());
  }),
};
