import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

type ApiAuth = { supabase: SupabaseClient | null; user: User | null };

// Авторизация для API: cookie-сессия (web) или Bearer-токен (мобильное приложение)
export async function getApiAuth(request: Request): Promise<ApiAuth> {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    const env = supabaseEnv();
    if (!env || !token) return { supabase: null, user: null };
    const supabase = createClient(env.url, env.key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.auth.getUser(token);
    return { supabase, user: data.user ?? null };
  }
  const supabase = getSupabaseServer();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}

export function ok(data: unknown, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}

export function fail(error: string, status = 400) {
  return Response.json({ success: false, data: null, error }, { status });
}
