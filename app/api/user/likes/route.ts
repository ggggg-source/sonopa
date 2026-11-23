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
  const { data, error: dbError } = await supabase!.from("user_likes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  if (dbError) return fail(dbError.message, 500);
  return ok({ likes: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { youtube_id?: string; title?: string; artist?: string; cover?: string };
  if (!body.youtube_id) return fail("youtube_id required");
  const { error: dbError } = await supabase!
    .from("user_likes")
    .upsert({ user_id: user!.id, youtube_id: body.youtube_id, title: body.title ?? "", artist: body.artist ?? "", cover: body.cover ?? "" }, { onConflict: "user_id,youtube_id" });
  if (dbError) return fail(dbError.message, 500);
  return ok({ liked: true });
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const youtubeId = searchParams.get("youtube_id");
  if (!youtubeId) return fail("youtube_id required");
  const { error: dbError } = await supabase!.from("user_likes").delete().eq("user_id", user!.id).eq("youtube_id", youtubeId);
  if (dbError) return fail(dbError.message, 500);
  return ok({ removed: true });
}
