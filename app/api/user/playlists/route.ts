import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = getSupabaseServer();
  if (!supabase) return { supabase: null, user: null, error: NextResponse.json({ success: false, data: null, error: "supabase not configured" }, { status: 503 }) };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, error: NextResponse.json({ success: false, data: null, error: "unauthorized" }, { status: 401 }) };
  return { supabase, user: data.user, error: null };
}

const ok = (data: unknown) => NextResponse.json({ success: true, data, error: null });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, data: null, error }, { status });

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  const { data, error: dbError } = await supabase!.from("user_playlists").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  if (dbError) return fail(dbError.message, 500);
  const { data: tracks } = await supabase!.from("playlist_tracks").select("*").order("position", { ascending: true });
  return ok({ playlists: data ?? [], tracks: tracks ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { name?: string; description?: string; cover?: string };
  if (!body.name?.trim()) return fail("name required");
  const { data, error: dbError } = await supabase!
    .from("user_playlists")
    .insert({ user_id: user!.id, name: body.name.trim(), description: body.description ?? "", cover: body.cover ?? "" })
    .select()
    .single();
  if (dbError) return fail(dbError.message, 500);
  return ok({ playlist: data });
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return fail("id required");
  const { error: dbError } = await supabase!.from("user_playlists").delete().eq("user_id", user!.id).eq("id", id);
  if (dbError) return fail(dbError.message, 500);
  return ok({ deleted: true });
}
