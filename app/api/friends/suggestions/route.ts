import { getApiAuth, ok, fail } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

// Рекомендации: пользователи с наибольшим числом общих лайков
export async function GET(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);

  const { data: myLikes } = await supabase.from("user_likes").select("youtube_id").eq("user_id", user.id);
  const myIds = new Set((myLikes ?? []).map((r) => r.youtube_id as string));

  const { data: existing } = await supabase.from("friends").select("user_id,friend_id").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  const exclude = new Set<string>([user.id]);
  for (const row of existing ?? []) {
    exclude.add(row.user_id as string);
    exclude.add(row.friend_id as string);
  }

  if (myIds.size === 0) {
    const { data: profiles } = await supabase.from("profiles").select("id,email,name").order("created_at", { ascending: false }).limit(50);
    return ok({ suggestions: (profiles ?? []).filter((p) => !exclude.has(p.id as string)).slice(0, 20) });
  }

  const { data: othersLikes } = await supabase
    .from("user_likes")
    .select("user_id,youtube_id")
    .in("youtube_id", [...myIds].slice(0, 200));

  const overlap = new Map<string, number>();
  for (const row of othersLikes ?? []) {
    const uid = row.user_id as string;
    if (uid === user.id || exclude.has(uid)) continue;
    overlap.set(uid, (overlap.get(uid) ?? 0) + 1);
  }
  const topIds = [...overlap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);

  if (topIds.length === 0) {
    const { data: profiles } = await supabase.from("profiles").select("id,email,name").order("created_at", { ascending: false }).limit(50);
    return ok({ suggestions: (profiles ?? []).filter((p) => !exclude.has(p.id as string)).slice(0, 20) });
  }

  const { data: profiles } = await supabase.from("profiles").select("id,email,name").in("id", topIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const suggestions = topIds.map((uid) => ({ ...(byId.get(uid) ?? { id: uid, email: "", name: "" }), commonLikes: overlap.get(uid) ?? 0 }));
  return ok({ suggestions });
}
