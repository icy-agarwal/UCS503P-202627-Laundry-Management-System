import type { Status, ComplaintStatus, ComplaintType } from '../api/types';
import type { Tone } from './theme';

export const STATUS: Record<Status, [string, Tone]> = {
  WAITING_FOR_VERIFICATION: ['Waiting for verification', 'bl'],
  AWAITING_TAGGING: ['Awaiting tagging', 'am'],
  TAGGED: ['Tagged', 'am'],
  IN_LAUNDRY: ['In laundry', 'am'],
  RETURNED: ['Returned', 'gr'],
  READY_FOR_PICKUP: ['Ready for pickup', 'gr'],
  COLLECTED: ['Collected', 'gr'],
  CANCELLED: ['Rejected', 'rd'],
};

/** What the student sees (the staff-only RETURNED state still reads as "In laundry"). */
export const STEPS = ['Submitted', 'Verified', 'Tagged', 'In laundry', 'Ready for pickup', 'Collected'];
export const stepOf = (s: Status): number =>
  ({ WAITING_FOR_VERIFICATION: 0, AWAITING_TAGGING: 1, TAGGED: 2, IN_LAUNDRY: 3, RETURNED: 3, READY_FOR_PICKUP: 4, COLLECTED: 5, CANCELLED: 0 })[s];
export const studentTone = (s: Status): Tone => (s === 'CANCELLED' ? 'rd' : stepOf(s) < 3 ? 'bl' : stepOf(s) === 3 ? 'am' : 'gr');
export const studentLabel = (s: Status) => (s === 'CANCELLED' ? 'Rejected' : STEPS[stepOf(s)]);

export const COMPLAINT_FLOW: ComplaintStatus[] = ['Open', 'Under review', 'Investigating', 'Resolved', 'Closed'];
export const COMPLAINT_TYPES: ComplaintType[] = ['Missing', 'Damaged', 'Wrong item', 'Incorrect quantity', 'Delay', 'Other'];
export const complaintTone = (s: ComplaintStatus): Tone => (s === 'Open' ? 'rd' : s === 'Resolved' || s === 'Closed' ? 'gr' : 'am');

export const QUEUES: { key: string; label: string; tile: string; statuses: Status[] }[] = [
  { key: 'verify', label: 'Verify', tile: 'To verify', statuses: ['WAITING_FOR_VERIFICATION'] },
  { key: 'tag', label: 'Tagging', tile: 'To tag', statuses: ['AWAITING_TAGGING', 'TAGGED'] },
  { key: 'wash', label: 'In laundry', tile: 'In laundry', statuses: ['IN_LAUNDRY'] },
  { key: 'ret', label: 'Returned', tile: 'Returned', statuses: ['RETURNED'] },
  { key: 'pick', label: 'Ready', tile: 'Ready for pickup', statuses: ['READY_FOR_PICKUP'] },
];

export const SCHEDULE_OPTIONS: { label: string; days: [number, number] }[] = [
  { label: 'Monday / Friday', days: [1, 5] },
  { label: 'Tuesday / Saturday', days: [2, 6] },
  { label: 'Wednesday / Saturday', days: [3, 6] },
];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Icon artwork for the default clothing categories (admin-added categories fall back to a bag). */
export const ITEM_ICONS: Record<string, { h: number; d: string }> = {
  'Shirts': { h: 215, d: 'M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-1 2-2.500 3-4 3S9 5 8 3zM12 6v15' },
  'T-Shirts': { h: 350, d: 'M9 3L3 6.500l2.500 3.500L8 9v12h8V9l2.500 1L21 6.500 15 3a3 3 0 01-6 0z' },
  'Jeans / Pants': { h: 225, d: 'M7 3h10l1.500 18h-4.500L12 10l-2 11H5.500zM7 7h10' },
  'Shorts': { h: 30, d: 'M6 4h12l1.500 11h-6L12 11l-1.500 4h-6zM6.500 8h11' },
  'Pyjama': { h: 265, d: 'M7 3h10l1 18h-4l-2-12-2 12H6zM7 6.500h10M12 3v3.500' },
  'Kurta / Salwar': { h: 160, d: 'M9 3L4 6l1.500 4L8 9v12h8V9l2.500 1L20 6l-5-3c-1 2-5 2-6 0zM12 5v7' },
  'Bedsheet': { h: 195, d: 'M3 19v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 16h18M6.500 9V6.500h4.500V9' },
  'Pillow Cover': { h: 290, d: 'M4 7c4-2 12-2 16 0v10c-4 2-12 2-16 0zM4 7c1.500 3 1.500 7 0 10M20 7c-1.500 3-1.500 7 0 10' },
  'Towel': { h: 175, d: 'M5 3h14v14H5zM5 7h14M5 17v3.500M8.500 17v3.500M12 17v3.500M15.500 17v3.500M19 17v3.500' },
  'Turban / Dupatta': { h: 20, d: 'M3 8c4 3 14-3 18 0v3c-4-3-14 3-18 0zM6 13l-1 8M11 14l-1 7M16 13l1 8' },
};
export const DEFAULT_CATEGORIES = Object.keys(ITEM_ICONS);
export const DEFAULT_CONDITIONS = ['Small tear', 'Faded color', 'Stain', 'Missing button', 'Other damage'];
