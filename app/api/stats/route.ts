import { NextResponse } from "next/server";
import { statsSnapshot } from "@/lib/api-stats";

export const dynamic = "force-dynamic";

// Dev-мониторинг: счётчики обращений к внешним API и cache hit rate.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(statsSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
