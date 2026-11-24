import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleProp, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Tone, toneColors } from '../constants/theme';
import { ITEM_ICONS } from '../constants/domain';
import { useTheme } from '../hooks/useTheme';
import { invalidate, Query } from '../hooks/useApi';
import { Icon, IconName } from './Icon';
import Svg, { Path } from 'react-native-svg';

/* ------------------------------------------------------------------ text */
const FF = { m: 'Manrope_500Medium', b: 'Manrope_700Bold', x: 'Manrope_800ExtraBold' };
type TP = React.ComponentProps<typeof Text> & { w?: 'm' | 'b' | 'x'; size?: number; color?: string; mu?: boolean };
export function T({ w = 'm', size, color, mu, style, ...p }: TP) {
  const th = useTheme();
  return <Text {...p} style={[{ fontFamily: FF[w], fontSize: size ?? (mu ? 14 : 15), color: color ?? (mu ? th.mu : th.tx) }, style as TextStyle]} />;
}
export const H1 = (p: TP) => <T w="x" size={26} {...p} />;
export const H2 = (p: TP) => <T w="b" size={17} {...p} />;
export const Mu = (p: TP) => <T mu {...p} />;
export const Label = (p: TP) => <T w="b" size={13} {...p} />;
export function Err({ children }: { children?: React.ReactNode }) {
  const th = useTheme();
  return children ? <T w="b" size={13} color={th.rdt}>{children}</T> : null;
}
export const Caption = (p: TP) => <T w="b" size={12} mu style={{ textTransform: 'uppercase', letterSpacing: 0.5 }} {...p} />;

/* ------------------------------------------------------------------ layout */
type VS = { style?: StyleProp<ViewStyle>; children?: React.ReactNode };
export function Row({ children, start, gap = 10, wrap, style, top }: VS & { start?: boolean; gap?: number; wrap?: boolean; top?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: top ? 'flex-start' : 'center', justifyContent: start ? 'flex-start' : 'space-between', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}
export const Stack = ({ children, gap = 12, style }: VS & { gap?: number }) => <View style={[{ gap }, style]}>{children}</View>;
export function Divider() {
  const th = useTheme();
  return <View style={{ height: 1, backgroundColor: th.bd }} />;
}

export function Screen({ children, onRefresh, refreshing, footer, gap = 14, wide }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; footer?: React.ReactNode; gap?: number; wide?: boolean }) {
  const th = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: th.bg }}>
      <ScrollView
        style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: wide ? 24 : 18, gap, paddingBottom: 28, width: '100%', maxWidth: wide ? 1100 : undefined, alignSelf: 'center' }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ padding: 14, paddingTop: 10, backgroundColor: th.bg, borderTopWidth: 1, borderTopColor: th.bd }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Caps width and shows a phone-style frame on wide web screens (student & staff apps). */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: th.outer, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[{ flex: 1, width: '100%', maxWidth: 460, backgroundColor: th.bg, overflow: 'hidden' },
        Platform.OS === 'web' ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: th.bd } : null]}>
        {children}
      </View>
    </View>
  );
}

export function Card({ children, tone, style, onPress, pad = 16 }: VS & { tone?: 'ok' | 'bad' | 'warn' | 'info'; onPress?: () => void; pad?: number }) {
  const th = useTheme();
  const bg = tone === 'ok' ? th.grb : tone === 'bad' ? th.rdb : tone === 'warn' ? th.amb : tone === 'info' ? th.blb : th.card;
  const s: ViewStyle = { backgroundColor: bg, borderWidth: 1, borderColor: tone ? 'transparent' : th.bd, borderRadius: 18, padding: pad };
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }, style]}>{children}</Pressable> : <View style={[s, style]}>{children}</View>;
}

export function Pill({ text, tone = 'bl' }: { text: string; tone?: Tone }) {
  const c = toneColors(useTheme(), tone);
  return <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, alignSelf: 'flex-start' }}><T w="b" size={12} color={c.fg}>{text}</T></View>;
}

/* ------------------------------------------------------------------ controls */
export function Btn({ label, onPress, kind = 'default', small, disabled, flex, icon, loading, style }:
  { label: string; onPress?: () => void; kind?: 'primary' | 'default' | 'danger' | 'dashed'; small?: boolean; disabled?: boolean; flex?: boolean; icon?: IconName; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const th = useTheme();
  const prim = kind === 'primary';
  const fg = prim ? '#fff' : kind === 'danger' ? th.rdt : kind === 'dashed' ? th.mu : th.tx;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button" onPress={off ? undefined : onPress}
      style={({ pressed }) => [{
        minHeight: small ? 40 : 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: prim ? th.pr : kind === 'dashed' ? 'transparent' : th.card, borderWidth: kind === 'dashed' ? 1.5 : 1,
        borderStyle: kind === 'dashed' ? 'dashed' : 'solid', borderColor: prim ? th.pr : kind === 'dashed' ? th.mu : th.bd,
        opacity: off ? 0.45 : pressed ? 0.85 : 1, flex: flex ? 1 : undefined,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <T w="b" color={fg} size={small ? 14 : 15}>{label}</T>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, justifyContent: 'center', backgroundColor: on ? th.pr : th.card, borderColor: on ? th.pr : th.bd }}>
      <T w="b" size={13} color={on ? '#fff' : th.tx}>{label}</T>
    </Pressable>
  );
}
export function Chips<V extends string>({ options, value, onChange, scroll }: { options: readonly V[] | { v: V; l: string }[]; value?: V; onChange: (v: V) => void; scroll?: boolean }) {
  const items = (options as any[]).map((o) => (typeof o === 'string' ? { v: o as V, l: o } : (o as { v: V; l: string })));
  const body = items.map((o) => <Chip key={o.v} label={o.l} on={value === o.v} onPress={() => onChange(o.v)} />);
  return scroll
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>{body}</ScrollView>
    : <Row wrap start gap={8}>{body}</Row>;
}

export function Field({ label, error, style, multiline, ...p }: TextInputProps & { label?: string; error?: string }) {
  const th = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={th.mu} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}
        style={[{ minHeight: multiline ? 84 : 48, borderWidth: 1, borderColor: th.bd, borderRadius: 12, padding: 12, fontSize: 15, fontFamily: FF.m, backgroundColor: th.card, color: th.tx }, style]}
        {...p}
      />
      <Err>{error}</Err>
    </View>
  );
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (n: number) => void; min?: number }) {
  const th = useTheme();
  const b = (t: string, fn: () => void, l: string) => (
    <Pressable accessibilityLabel={l} onPress={fn} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: th.tx, alignItems: 'center', justifyContent: 'center', backgroundColor: th.card }}>
      <T w="b" size={18}>{t}</T>
    </Pressable>
  );
  return <Row start gap={8}>{b('−', () => onChange(Math.max(min, value - 1)), 'Decrease')}<T w="b" style={{ minWidth: 22, textAlign: 'center' }}>{value}</T>{b('+', () => onChange(value + 1), 'Increase')}</Row>;
}

export function Banner({ tone, title, sub, icon = 'ok' }: { tone: 'gr' | 'am' | 'bl'; title: string; sub?: string; icon?: IconName }) {
  const c = toneColors(useTheme(), tone);
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.fg, backgroundColor: c.bg }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.45)' }}><Icon name={icon} size={22} color={c.fg} /></View>
      <View style={{ flex: 1 }}><T w="x" color={c.fg}>{title}</T>{sub ? <T size={13} color={c.fg} style={{ opacity: 0.85 }}>{sub}</T> : null}</View>
    </View>
  );
}

export function Header({ title, fallback }: { title: string; fallback: string }) {
  const th = useTheme(), r = useRouter();
  return (
    <Row start gap={10}>
      <Pressable accessibilityLabel="Back" onPress={() => (r.canGoBack() ? r.back() : r.replace(fallback as any))} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: th.bd, backgroundColor: th.card, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" color={th.tx} />
      </Pressable>
      <H2>{title}</H2>
    </Row>
  );
}

export function Segments({ n, done, active, onHero }: { n: number; done: number; active?: number; onHero?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: i < done ? (onHero ? '#fff' : th.pr) : i === active ? (onHero ? '#F5C26B' : th.amber) : onHero ? 'rgba(255,255,255,0.28)' : th.off }} />
      ))}
    </View>
  );
}

export function Avatar({ text, size = 46, onPress, tint }: { text: string; size?: number; onPress?: () => void; tint?: string }) {
  const th = useTheme();
  const v = <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint ?? th.hero1, alignItems: 'center', justifyContent: 'center' }}><T w="x" color="#fff" size={size * 0.34}>{text}</T></View>;
  return onPress ? <Pressable accessibilityLabel="Profile" onPress={onPress}>{v}</Pressable> : v;
}

export function IconButton({ name, onPress, badge, label }: { name: IconName; onPress: () => void; badge?: number; label: string }) {
  const th = useTheme();
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: th.bd, backgroundColor: th.card, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={th.tx} />
      {badge ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: th.danger, alignItems: 'center', justifyContent: 'center' }}><T w="x" size={11} color="#fff">{badge}</T></View> : null}
    </Pressable>
  );
}

export function ItemIcon({ name, size = 56, glyph }: { name: string; size?: number; glyph?: number }) {
  const i = ITEM_ICONS[name] ?? { h: 210, d: 'M5 8h14l-1 13H6zM9 8a3 3 0 016 0' };
  const g = glyph ?? Math.round(size * 0.54);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.29), backgroundColor: `hsla(${i.h}, 75%, 55%, 0.16)`, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={g} height={g} viewBox="0 0 24 24" fill="none" stroke={`hsl(${i.h}, 65%, 46%)`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d={i.d} /></Svg>
    </View>
  );
}

export function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const th = useTheme();
  return <Pressable onPress={onPress}><T w="b" color={th.pr}>{label}</T></Pressable>;
}

/* ------------------------------------------------------------------ data display */
export function Timeline({ entries }: { entries: { a: string; sub: string }[] }) {
  const th = useTheme();
  return (
    <View>
      {entries.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, paddingBottom: i === entries.length - 1 ? 0 : 14 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: th.pr, marginTop: 4 }} />
            {i < entries.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: th.bd, marginTop: 2 }} /> : null}
          </View>
          <View style={{ flex: 1 }}><T size={14}>{e.a}</T><T size={12} mu>{e.sub}</T></View>
        </View>
      ))}
    </View>
  );
}

export function Bars({ items, max }: { items: [string, number, string?][]; max?: number }) {
  const th = useTheme(), m = max ?? Math.max(1, ...items.map((i) => i[1]));
  return (
    <View style={{ gap: 10 }}>
      {items.map(([l, v, t]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T size={14} style={{ width: 120 }} numberOfLines={1}>{l}</T>
          <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: th.off, overflow: 'hidden' }}><View style={{ width: `${Math.round((v / m) * 100)}%`, height: '100%', backgroundColor: th.pr, borderRadius: 6 }} /></View>
          <T w="b" style={{ width: 44, textAlign: 'right' }}>{t ?? v}</T>
        </View>
      ))}
    </View>
  );
}

export function Table({ cols, rows, empty = 'Nothing to show.' }: { cols: { h: string; min?: number; flex?: number }[]; rows: React.ReactNode[][]; empty?: string }) {
  const th = useTheme();
  const total = cols.reduce((a, c) => a + (c.min ?? 110), 0);
  const cell = (c: { min?: number; flex?: number }, node: React.ReactNode, i: number, head?: boolean) => (
    <View key={i} style={{ flex: c.flex ?? 1, minWidth: c.min ?? 110, paddingHorizontal: 14, paddingVertical: head ? 12 : 12, justifyContent: 'center' }}>
      {typeof node === 'string' || typeof node === 'number' ? (head ? <Caption>{node}</Caption> : <T size={14}>{node}</T>) : node}
    </View>
  );
  return (
    <View style={{ borderWidth: 1, borderColor: th.bd, borderRadius: 16, backgroundColor: th.card, overflow: 'hidden' }}>
      <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }} showsHorizontalScrollIndicator>
        <View style={{ minWidth: total, flexGrow: 1 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: th.bd }}>{cols.map((c, i) => cell(c, c.h, i, true))}</View>
          {rows.length ? rows.map((r, ri) => (
            <View key={ri} style={{ flexDirection: 'row', borderBottomWidth: ri === rows.length - 1 ? 0 : 1, borderBottomColor: th.bd }}>{r.map((n, i) => cell(cols[i], n, i))}</View>
          )) : <View style={{ padding: 28, alignItems: 'center' }}><Mu>{empty}</Mu></View>}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ async state */
export function Async<D>({ q, children }: { q: Query<D>; children: (d: D) => React.ReactNode }) {
  const th = useTheme();
  if (q.data === undefined) {
    if (q.error) return <Card tone="bad"><T w="b" color={th.rdt}>{q.error}</T><View style={{ height: 10 }} /><Btn label="Try again" onPress={q.reload} small /></Card>;
    return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={th.pr} /></View>;
  }
  return <>{children(q.data)}</>;
}
export const Empty = ({ text }: { text: string }) => <Card><Mu>{text}</Mu></Card>;

/** Inline "are you sure?" used for destructive / account-level admin actions. */
export function ConfirmBtn({ label, message, onConfirm, kind = 'danger', small }: { label: string; message: string; onConfirm: () => void | Promise<void>; kind?: 'danger' | 'primary' | 'default'; small?: boolean }) {
  const th = useTheme();
  const [ask, setAsk] = useState(false), [busy, setBusy] = useState(false);
  if (!ask) return <Btn label={label} kind={kind} small={small} onPress={() => setAsk(true)} />;
  return (
    <Card tone="warn" pad={14}>
      <T w="b" color={th.amt}>{message}</T>
      <Row start wrap style={{ marginTop: 10 }}>
        <Btn label="Confirm" kind="primary" small loading={busy} onPress={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setAsk(false); } }} />
        <Btn label="Cancel" small onPress={() => setAsk(false)} />
      </Row>
    </Card>
  );
}

/* ------------------------------------------------------------------ toast */
const ToastCtx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2600); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 90, alignItems: 'center', zIndex: 50 }}>
        <View pointerEvents="none" style={{ backgroundColor: th.toast, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, maxWidth: 520 }}><T w="b" size={14} color={th.toastTx} role="status">{msg}</T></View>
      </View> : null}
    </ToastCtx.Provider>
  );
}

/** Run an async action, toast the result or the error. Returns true on success. */
export function useRun() {
  const toast = useToast();
  return useCallback(async (fn: () => Promise<unknown>, ok?: string): Promise<boolean> => {
    try { await fn(); invalidate(); if (ok) toast(ok); return true; } catch (e) { toast(e instanceof Error ? e.message : String(e)); return false; }
  }, [toast]);
}

/** Shown while the saved session is being restored, so a page refresh keeps you where you were. */
export function Splash() {
  const th = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.bg }}><ActivityIndicator color={th.pr} /></View>;
}
