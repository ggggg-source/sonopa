import { getApiAuth, ok, fail } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);

  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return fail(error.message, 500);
  return ok({ requests: data ?? [] });
}
