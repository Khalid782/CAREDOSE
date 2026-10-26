/**
 * Supabase browser client.
 *
 * Deliberately unused for now: the app runs on the mock data layer until the
 * Supabase adapter in `lib/data/supabase/supabaseDataLayer.ts` is filled in and
 * NEXT_PUBLIC_DATA_SOURCE is set to "supabase".
 *
 * `createClient` only ever gets the public anon key here. A service-role key
 * must never reach a phone: this code ships inside the Android app.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when both public Supabase variables are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Creates (once) and returns the browser client.
 * Throws when the environment variables are missing, so a misconfigured build
 * fails loudly instead of talking to `undefined.supabase.co`.
 */
export function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "CareDose: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.example).",
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

/** The client, or null when Supabase is not configured yet. */
export function getSupabaseClient(): SupabaseClient | null {
  return isSupabaseConfigured() ? createSupabaseClient() : null;
}
