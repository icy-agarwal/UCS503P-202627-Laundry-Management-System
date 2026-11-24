import React from 'react';
import Svg, { Path } from 'react-native-svg';

const P = {
  home: 'M3 11l9-8 9 8v10H3zM9 21v-7h6v7',
  submit: 'M12 5v14M5 12h14',
  history: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 19h2v2h-2z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4',
  back: 'M15 5l-7 7 7 7',
  chev: 'M9 5l7 7-7 7',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
  ok: 'M5 12l5 5 9-10',
  pin: 'M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  bag: 'M5 8h14l-1 13H6zM9 8a3 3 0 016 0',
  queues: 'M4 6h16M4 12h16M4 18h10',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  dash: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  users: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8',
  staff: 'M3 5h18v14H3zM8 11a2 2 0 100-4 2 2 0 000 4zM5.5 16c.5-1.5 1.7-2 2.5-2s2 .5 2.5 2M14 9h4M14 13h4',
  building: 'M4 21V5l8-2 8 2v16M9 21v-4h6v4M8 9h2M14 9h2M8 13h2M14 13h2',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  log: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
};
export type IconName = keyof typeof P;

export function Icon({ name, size = 22, color = '#000' }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={P[name]} />
    </Svg>
  );
}
