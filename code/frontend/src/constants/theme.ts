export const light = {
  bg: '#F4F5F7', card: '#FFFFFF', tx: '#1A1D23', mu: '#5F6672', bd: '#E5E7EB', pr: '#2F5FD0',
  blb: '#E8EEFB', blt: '#2447A8', amb: '#FDF0DC', amt: '#8A5300', grb: '#E3F4EA', grt: '#176B3A',
  rdb: '#FDE8E8', rdt: '#A31B1B', off: '#E2E4E8', hero1: '#2F5FD0', hero2: '#1E3F96',
  danger: '#C0262D', amber: '#E8A33D', toast: '#1A1D23', toastTx: '#FFFFFF', outer: '#CFD3DA', frame: '#1A1D23',
};
export type Palette = typeof light;

export const dark: Palette = {
  bg: '#0F1218', card: '#1A1F29', tx: '#EDEFF3', mu: '#A3ABB8', bd: '#2B3140', pr: '#3A68DB',
  blb: '#1E2A4A', blt: '#A9C0FF', amb: '#3A2D12', amt: '#F3C77E', grb: '#12301F', grt: '#8FDDAE',
  rdb: '#3C1A1A', rdt: '#FFA9A9', off: '#2B3140', hero1: '#3A68DB', hero2: '#1E2F6B',
  danger: '#C0262D', amber: '#E8A33D', toast: '#EDEFF3', toastTx: '#0F1218', outer: '#080A0E', frame: '#2B3140',
};

export type Tone = 'bl' | 'am' | 'gr' | 'rd' | 'gy';
export const toneColors = (p: Palette, t: Tone) =>
  ({ bl: { bg: p.blb, fg: p.blt }, am: { bg: p.amb, fg: p.amt }, gr: { bg: p.grb, fg: p.grt }, rd: { bg: p.rdb, fg: p.rdt }, gy: { bg: p.off, fg: p.mu } })[t];
