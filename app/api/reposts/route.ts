import { getApiAuth, ok, fail } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["track", "playlist"]);

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const url = new URL(request.url);
  const targetUser = url.searchParams.get("userId") ?? user.id;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const { data, error, count } = await supabase
    .from("reposts")
    .select("*", { count: "exact" })
    .eq("user_id", targetUser)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return fail(error.message, 500);
  return ok({ reposts: data ?? [], total: count ?? 0, limit, offset });
}

export async function POST(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const type = String(body.type ?? "");
  if (!VALID_TYPES.has(type)) return fail("type must be 'track' or 'playlist'", 400);

  const youtubeId = body.youtubeId ? String(body.youtubeId) : null;
  const playlistId = body.playlistId ? String(body.playlistId) : null;
  if (type === "track" && (!youtubeId || !/^[\w-]{6,20}$/.test(youtubeId))) return fail("invalid youtubeId", 400);
  if (type === "playlist" && !playlistId) return fail("playlistId required", 400);
  if (!body.title || typeof body.title !== "string") return fail("title required", 400);

  const { data, error } = await supabase
    .from("reposts")
    .insert({
      user_id: user.id,
      type,
      youtube_id: youtubeId,
      playlist_id: playlistId,
      title: String(body.title).slice(0, 300),
      artist: String(body.artist ?? "").slice(0, 300),
      cover: String(body.cover ?? "").slice(0, 500),
      original_user_id: body.originalUserId ? String(body.originalUserId) : null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail("already reposted", 409);
    return fail(error.message, 500);
  }
  return ok({ repost: data }, 201);
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return fail("id required", 400);
  const { error } = await supabase.from("reposts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message, 500);
  return ok({ deleted: true });
}
