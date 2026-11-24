import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { errMsg } from '../lib/format';

/** Every mutation calls invalidate(); every mounted query re-fetches. */
let version = 0;
const subs = new Set<() => void>();
export const invalidate = () => { version++; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export interface Query<T> { data?: T; error?: string; loading: boolean; reload: () => void }

export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): Query<T> {
  const v = useSyncExternalStore(subscribe, () => version, () => version);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const ref = useRef(fn); ref.current = fn;
  const first = useRef(true);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    ref.current().then(
      (data) => { if (live) setState({ data, loading: false }); },
      (e) => { if (live) setState((s) => ({ data: s.data, error: errMsg(e), loading: false })); },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, tick, ...deps]);

  // Re-fetch when the screen regains focus (tabs keep screens mounted).
  useFocusEffect(useCallback(() => { if (first.current) { first.current = false; return; } setTick((t) => t + 1); }, []));

  return { ...state, reload: () => setTick((t) => t + 1) };
}
