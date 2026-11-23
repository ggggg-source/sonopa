import { getApiAuth, ok, fail } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await getApiAuth(request); // не обязательно, но принимаем Bearer/cookie
  const { supabase } = await getApiAuth(request);
  if (!supabase) return fail("supabase not configured", 503);
  const id = params.id;
  if (!UUID_RE.test(id)) return fail("invalid user id", 400);

  const [profileRes, repostsRes, friendsRes, likesRes] = await Promise.all([
    supabase.from("profiles").select("id,email,name").eq("id", id).maybeSingle(),
    supabase.from("reposts").select("*", { count: "exact", head: true }).eq("user_id", id),
    supabase.from("friends").select("*", { count: "exact", head: true }).or(`user_id.eq.${id},friend_id.eq.${id}`).eq("status", "accepted"),
    supabase.from("user_likes").select("*", { count: "exact", head: true }).eq("user_id", id),
  ]);

  return ok({
    user: profileRes.data ?? { id },
    stats: {
      reposts: repostsRes.count ?? 0,
      friends: friendsRes.count ?? 0,
      likes: likesRes.count ?? 0,
    },
  });
}
