'use client';
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://trqasodumtzbitvnwppc.supabase.co';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_G5F6xVd9Ac-IRKWoOxdciA_pSrqEvvQ';

export function createClient() {
  return createBrowserClient(URL, KEY);
}
