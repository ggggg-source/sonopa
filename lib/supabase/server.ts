import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase/env";

export function getSupabaseServer() {
  const env = supabaseEnv();
  if (!env) return null;
  const cookieStore = cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // @supabase/ssr передаёт массив { name, value, options };
      // типы cookies в разных версиях Next различаются, поэтому аннотируем явно.
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. The callback route can.
        }
      },
    },
  });
}
