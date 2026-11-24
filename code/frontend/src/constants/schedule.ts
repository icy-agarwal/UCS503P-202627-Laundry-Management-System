import { useSyncExternalStore } from 'react';
import type { Hostel } from '../api/types';
import { DAY_NAMES } from './domain';

/** Counter hours: 12:30-3:00 PM and 4:00-7:00 PM (3-4 PM is the lunch break), on the hostel's laundry days. */
const WIN: [number, number][] = [[750, 900], [960, 1140]];

export const tm = (m: number) => {
  const h = Math.floor(m / 60), x = m % 60;
  return `${h % 12 || 12}:${String(x).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

type Demo = { d: number | null; m: number | null };
/** Demo clock (used only in demo mode, so the schedule rules can be shown at any time of day). */
let demo: Demo = { d: null, m: null };
const subs = new Set<() => void>();
export const setDemoClock = (d: number | null, m: number | null) => { demo = { d, m }; subs.forEach((f) => f()); };
export const useDemoClock = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => demo, () => demo);

function nowParts(dm: Demo) {
  const t = new Date();
  return { d: dm.d ?? t.getDay(), m: dm.m ?? (dm.d != null ? 810 : t.getHours() * 60 + t.getMinutes()) };
}

export interface Slot { open: boolean; tone: 'gr' | 'am' | 'bl'; title: string; sub: string }

export function counterSlot(hostel: Hostel | undefined, dm: Demo = demo, enforce = true): Slot {
  if (!enforce) return { open: true, tone: 'gr', title: 'Counter hours are switched off', sub: 'You can submit any time while this demo setting is on.' };
  if (!hostel) return { open: false, tone: 'am', title: 'Set up your hostel', sub: 'Add your hostel in Profile.' };
  const n = nowParts(dm);
  const win = WIN.find(([a, b]) => n.m >= a && n.m < b);
  const next = hostel.days.map((d) => ({ d, g: (d - n.d + 7) % 7 })).filter((x) => x.g > 0).sort((a, b) => a.g - b.g)[0] ?? { d: hostel.days[0], g: 7 };
  if (hostel.days.includes(n.d)) {
    if (win) return { open: true, tone: 'gr', title: 'Laundry counter is open for your hostel', sub: `Drop-off and pickup until ${tm(win[1])} today.` };
    if (n.m < 750) return { open: false, tone: 'am', title: 'Opens today at 12:30 PM', sub: 'Collection and pickup run 12:30–3:00 PM and 4:00–7:00 PM.' };
    if (n.m < 960) return { open: false, tone: 'am', title: 'Lunch break · reopens 4:00 PM', sub: 'The counter is closed from 3:00 to 4:00 PM.' };
    return { open: false, tone: 'bl', title: 'Today’s timings are over', sub: `Next laundry day: ${DAY_NAMES[next.d]}.` };
  }
  return { open: false, tone: 'bl', title: `Next laundry day: ${DAY_NAMES[next.d]}`, sub: `${next.g === 1 ? 'Tomorrow' : `In ${next.g} days`} · 12:30–3:00 PM and 4:00–7:00 PM.` };
}
