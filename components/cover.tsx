"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/types";
import { cn } from "@/lib/format";

type Props = {
  title: string;
  color: string;
  accent: string;
  coverUrl?: string;
  fallbackUrl?: string;
  className?: string;
  rounded?: string;
};

// Обложка с цепочкой fallback: основная → fallbackUrl (YouTube thumb) → градиент с буквой.
export function CoverArt({ title, color, accent, coverUrl, fallbackUrl, className, rounded = "rounded-md" }: Props) {
  const [stage, setStage] = useState(0);
  useEffect(() => setStage(0), [coverUrl, fallbackUrl]);

  const src = stage === 0 ? coverUrl : stage === 1 ? fallbackUrl : undefined;

  return (
    <div
      className={cn("relative overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(145deg, ${color}, ${accent})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.45),transparent_42%)]" />
      {src ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setStage((s) => (s === 0 && fallbackUrl ? 1 : 2))}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tracking-tight text-white/90">
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function ytCover(youtubeId?: string) {
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : undefined;
}

export function sourceLabel(track: Track) {
  return track.source === "youtube" ? "YouTube" : "Каталог";
}
