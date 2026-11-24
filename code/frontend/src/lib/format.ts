import type { Items } from '../api/types';

export const pcs = (o: Items) => Object.values(o).reduce((a, x) => a + x, 0);
export const listItems = (o: Items) => Object.entries(o).map(([k, v]) => `${k} ×${v}`).join(', ');
export const did = (b: { bid: string | null; rid: string }) => b.bid ?? b.rid;
export const initials = (n: string) => (n || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const rollOf = (email: string) => (email.split('@')[0] || '').toUpperCase();
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "Today 09:10", "Yesterday 17:05", "19 Oct 18:20" */
export function fmtWhen(iso: string): string {
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return `Today ${hhmm(d)}`;
  if (sameDay(d, new Date(now.getTime() - 864e5))) return `Yesterday ${hhmm(d)}`;
  return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })} ${hhmm(d)}`;
}
/** "29 Oct" */
export const fmtShort = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`; };
/** date-only ISO ("2026-10-30") -> "Fri, 30 Oct" */
export const fmtExpected = (iso: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
export const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const whenDays = (iso: string) => {
  const n = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`;
};
export const isToday = (iso: string) => sameDay(new Date(iso), new Date());

import type { StudentRec } from '../api/types';
export const curEnrollment = (s: StudentRec) =>
  s.enrollments.find((e) => e.status === 'Active') ?? s.enrollments.find((e) => e.status === 'Pending renewal') ?? s.enrollments[s.enrollments.length - 1];
