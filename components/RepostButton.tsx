"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth-provider";
import type { Track } from "@/types";

export function RepostButton({ track, className, label }: { track: Track; className?: string; label?: string }) {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const repost = async () => {
    if (!user || user.provider !== "supabase") {
      toast("Войдите, чтобы делать репосты");
      return;
    }
    if (!track.youtubeId) {
      toast.error("У трека нет YouTube ID");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/reposts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "track", youtubeId: track.youtubeId, title: track.title, artist: track.artist, cover: track.coverUrl }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast.error(json.error === "already reposted" ? "Уже репостнуто" : json.error ?? "Ошибка репоста");
        return;
      }
      setDone(true);
      toast.success("Репост добавлен");
    } catch {
      toast.error("Нет сети");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void repost();
      }}
      disabled={pending || done}
      aria-label="Репостнуть трек"
      title="Репостнуть"
      className={className ?? "flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-highlight hover:text-white"}
    >
      {label ? <span>{done ? "Уже репостнуто" : label}</span> : <Share2 className={`h-4 w-4 ${done ? "fill-white text-white" : ""}`} />}
    </button>
  );
}
