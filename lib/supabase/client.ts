"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowser() {
  if (client !== undefined) return client;
  const env = supabaseEnv();
  client = env ? createBrowserClient(env.url, env.key) : null;
  return client;
}
