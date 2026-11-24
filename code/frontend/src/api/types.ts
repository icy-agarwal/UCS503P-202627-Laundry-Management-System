export type Role = 'student' | 'staff' | 'admin';

export type Status =
  | 'WAITING_FOR_VERIFICATION' | 'AWAITING_TAGGING' | 'TAGGED' | 'IN_LAUNDRY'
  | 'RETURNED' | 'READY_FOR_PICKUP' | 'COLLECTED' | 'CANCELLED';

export type ComplaintStatus = 'Open' | 'Under review' | 'Investigating' | 'Resolved' | 'Closed';
export type ComplaintType = 'Missing' | 'Damaged' | 'Wrong item' | 'Incorrect quantity' | 'Delay' | 'Other';
export type EnrollmentStatus = 'Active' | 'Ended' | 'Pending renewal';

/** category name -> quantity */
export type Items = Record<string, number>;

export interface Hostel { id: string; name: string; group: 'Boys' | 'Girls'; days: [number, number] } // [collection day, delivery day], 0 = Sunday
export interface Semester { id: string; name: string; start: string; end: string; current: boolean }
export interface Category { name: string; on: boolean; id?: number }
export interface Config {
  hostels: Hostel[]; semesters: Semester[]; categories: Category[]; conditions: string[];
  /** Supabase mode only: false = the counter-hours rule is switched off (demo). Undefined = not configurable. */
  enforceCounterHours?: boolean;
  /** Supabase mode: semesters follow each admission year, so "start semester" and renewals don't apply. */
  semestersReadOnly?: boolean;
}

export interface Enrollment { semesterId: string; hostelId: string; status: EnrollmentStatus }
export interface StudentProfile { name: string; gender: 'Boys' | 'Girls'; hostelId: string; room: string; phone: string; admissionYear?: number }
export type ProfileInput = StudentProfile;

export interface Me {
  id: string; role: Role; email: string; name: string;
  profile?: StudentProfile | null;        // students
  enrollment?: Enrollment | null;         // students: current semester enrollment
  hostelId?: string;                      // staff: counter
}

export interface LogEntry { t: string; who: string; role?: Role; a: string; from?: string; to?: string }
export interface Condition { c: string; k: string }

export interface Batch {
  rid: string;                 // request id, LR-1042
  bid: string | null;          // physical batch id, L-1042 (created in the tagging step)
  studentId: string; studentName: string;
  hostelId: string; room?: string; semesterId: string;
  status: Status; late?: boolean;
  submittedAt: string; expectedOn: string | null; returnedAt?: string | null;
  items: Items;                // verified (authoritative) contents
  original: Items;             // what the student entered
  conditions: Condition[]; remark: string;
  log: LogEntry[];
  tokenActive?: boolean; tokenUsed?: boolean;
  complaintId?: string | null;
}
export interface BatchQuery { status?: Status[]; search?: string }

export interface Pickup { token: string; code: string; used: boolean }
export type PickupLookup = { kind: 'ok' | 'used'; batch: Batch } | { kind: 'invalid' };

export interface Complaint {
  id: string; batchId: string; studentId: string; studentName: string; hostelId: string;
  type: ComplaintType; status: ComplaintStatus; escalated: boolean;
  filedAt: string; description: string; notes: LogEntry[];
}
export interface Notification { id: string; title: string; body: string; at: string; read: boolean }

export interface StudentRec {
  id: string; name: string; phone: string; email: string; active: boolean;
  enrollments: Enrollment[];
}
export interface StaffRec { id: string; name: string; email: string; phone?: string; hostelId: string; active: boolean; role?: 'staff' | 'admin' }
export interface AuditEntry { id: string; at: string; batchId: string; who: string; role: Role; action: string; from?: string; to?: string }

export class ApiError extends Error {
  status: number; network: boolean;
  constructor(message: string, status = 400, network = false) { super(message); this.status = status; this.network = network; }
}

export interface Api {
  setSession(token: string | null): void;
  auth: {
    /** Accepts an email or (staff) a 10-digit mobile number. Returns the email the code was sent to. */
    sendOtp(identifier: string): Promise<string>;
    verifyOtp(email: string, code: string): Promise<{ token: string; me?: Me }>;
  };
  me(): Promise<Me>;
  saveProfile(p: ProfileInput): Promise<Me>;
  renewEnrollment(): Promise<Me>;
  config(): Promise<Config>;

  listBatches(q?: BatchQuery): Promise<Batch[]>;
  getBatch(id: string): Promise<Batch>;
  submitRequest(items: Items, remark: string): Promise<Batch>;
  verifyRequest(rid: string, v: { items: Items; conditions: Condition[]; remark: string }): Promise<Batch>;
  rejectRequest(rid: string, reason: string): Promise<Batch>;
  generateBatchId(rid: string): Promise<Batch>;
  transition(rids: string[], to: 'TAGGED' | 'IN_LAUNDRY' | 'RETURNED' | 'READY_FOR_PICKUP'): Promise<Batch[]>;
  sendDelayNotice(rid: string): Promise<void>;
  getPickup(rid: string): Promise<Pickup | null>;
  lookupPickup(codeOrToken: string): Promise<PickupLookup>;
  confirmCollection(rid: string): Promise<Batch>;

  listComplaints(): Promise<Complaint[]>;
  getComplaint(id: string): Promise<Complaint>;
  createComplaint(i: { batchId: string; type: ComplaintType; description: string }): Promise<Complaint>;
  addComplaintNote(id: string, text: string): Promise<Complaint>;
  advanceComplaint(id: string, note?: string): Promise<Complaint>;
  escalateComplaint(id: string): Promise<Complaint>;
  sendBackComplaint(id: string): Promise<Complaint>;

  listNotifications(): Promise<Notification[]>;
  markAllRead(): Promise<void>;

  listStudents(search?: string): Promise<StudentRec[]>;
  getStudent(id: string): Promise<StudentRec>;
  changeHostel(id: string, hostelId: string): Promise<StudentRec>;
  setStudentActive(id: string, active: boolean): Promise<StudentRec>;
  listStaff(): Promise<StaffRec[]>;
  addStaff(i: { name: string; email: string; phone: string; hostelId: string }): Promise<StaffRec>;
  setStaffActive(id: string, active: boolean): Promise<StaffRec>;
  addHostel(i: { code: string; name: string; group: 'Boys' | 'Girls'; days: [number, number] }): Promise<Hostel>;
  setCounterEnforcement(on: boolean): Promise<void>;
  startSemester(i: { name: string; start: string; end: string }): Promise<{ pending: number }>;
  approveRenewals(): Promise<number>;
  addCategory(name: string): Promise<void>;
  toggleCategory(name: string): Promise<void>;
  addCondition(name: string): Promise<void>;
  removeCondition(name: string): Promise<void>;
  listAudit(q?: { search?: string; role?: string }): Promise<AuditEntry[]>;
}
