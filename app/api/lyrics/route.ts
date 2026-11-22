import { NextResponse } from "next/server";
import { searchLyrics } from "@/lib/lyrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist")?.trim() ?? "";
  const track = searchParams.get("track")?.trim() ?? "";

  if (!artist || !track) {
    return NextResponse.json({ error: "Нужны параметры artist и track" }, { status: 400 });
  }

  console.log(`[API] GET /api/lyrics artist="${artist}" track="${track}" — source: lrclib (cache см. [Cache])`);
  try {
    const result = await searchLyrics(artist, track);
    if (!result) return NextResponse.json({ error: "Текст не найден" }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "lyrics error" }, { status: 500 });
  }
}
