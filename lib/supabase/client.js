'use client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://trqasodumtzbitvnwppc.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_G5F6xVd9Ac-IRKWoOxdciA_pSrqEvvQ';

// Singleton para evitar múltiples instancias
let _client;
export function createClient() {
  if (!_client) {
    _client = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}
