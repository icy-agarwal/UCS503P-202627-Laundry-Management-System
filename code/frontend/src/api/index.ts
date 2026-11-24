import type { Api } from './types';
import { httpApi } from './http';
import { mockApi } from './mock';
import { supabaseApi } from './supabase';

/**
 * Which data source the app uses:
 *  - "supabase": EXPO_PUBLIC_SUPABASE_URL is set (the real database)
 *  - "http":     EXPO_PUBLIC_API_URL is set (your own Express server, if you ever build one)
 *  - "mock":     nothing is set (demo mode: in-memory data, OTP 123456)
 * EXPO_PUBLIC_API_MODE can force one of them.
 */
const forced = process.env.EXPO_PUBLIC_API_MODE;
const mode = forced || (process.env.EXPO_PUBLIC_SUPABASE_URL ? 'supabase' : process.env.EXPO_PUBLIC_API_URL ? 'http' : 'mock');
export const isMock = mode === 'mock';
export const api: Api = mode === 'supabase' ? supabaseApi : mode === 'http' ? httpApi : mockApi;
