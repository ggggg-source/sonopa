import { getApiAuth, ok, fail } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const url = new URL(request.url);
  const targetUser = url.searchParams.get("userId") ?? user.id;
  const status = url.searchParams.get("status");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  let query = supabase
    .from("friends")
    .select("*", { count: "exact" })
    .or(`user_id.eq.${targetUser},friend_id.eq.${targetUser}`);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return fail(error.message, 500);
  return ok({ friends: data ?? [], total: count ?? 0, limit, offset });
}

export async function POST(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const body = (await request.json().catch(() => ({}))) as { friendId?: string; friendEmail?: string; friendName?: string };
  const friendId = String(body.friendId ?? "");
  if (!UUID_RE.test(friendId)) return fail("invalid friendId", 400);
  if (friendId === user.id) return fail("cannot add yourself", 400);

  // Ищем профиль целевого пользователя для отображаемого имени
  let friendName = body.friendName ?? "";
  let friendEmail = body.friendEmail ?? "";
  if (!friendName || !friendEmail) {
    const { data: profile } = await supabase.from("profiles").select("email,name").eq("id", friendId).maybeSingle();
    friendName = friendName || profile?.name || "";
    friendEmail = friendEmail || profile?.email || "";
  }

  const { data, error } = await supabase
    .from("friends")
    .insert({ user_id: user.id, friend_id: friendId, friend_name: friendName, friend_email: friendEmail, status: "pending" })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return fail("request already exists", 409);
    return fail(error.message, 500);
  }
  return ok({ friendship: data }, 201);
}

export async function PUT(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !UUID_RE.test(body.id)) return fail("invalid id", 400);
  if (body.status !== "accepted" && body.status !== "rejected") return fail("status must be accepted|rejected", 400);

  // Принять/отклонить может только получатель запроса
  const { data: row } = await supabase.from("friends").select("friend_id,status").eq("id", body.id).maybeSingle();
  if (!row) return fail("not found", 404);
  if (row.friend_id !== user.id) return fail("forbidden", 403);

  const { error } = await supabase.from("friends").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return fail(error.message, 500);
  return ok({ updated: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getApiAuth(request);
  if (!supabase || !user) return fail("unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");
  if (!friendId || !UUID_RE.test(friendId)) return fail("invalid friendId", 400);

  const { error } = await supabase
    .from("friends")
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
  if (error) return fail(error.message, 500);
  return ok({ deleted: true });
}
