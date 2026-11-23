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
// Обычный <img> + CSS transition — не зависит от JS-анимаций, обложка видна всегда.
export function CoverArt({ title, color, accent, coverUrl, fallbackUrl, className, rounded = "rounded-md" }: Props) {
  const [stage, setStage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setStage(0);
    setLoaded(false);
  }, [coverUrl, fallbackUrl]);

  const candidates = [coverUrl, fallbackUrl].filter((u): u is string => Boolean(u));
  const src = candidates[Math.min(stage, candidates.length - 1)];

  return (
    <div
      className={cn("relative overflow-hidden", rounded, className)}
      style={{ background: `linear-gradient(145deg, ${color || "#1a1a1a"}, ${accent || "#0a0a0a"})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.45),transparent_42%)]" />
      {src ? (
        <img
          key={src}
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setStage((s) => Math.min(s + 1, candidates.length))}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        />
      ) : null}
      {!src || !loaded ? (
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold tracking-tight text-white/90">
          {title.slice(0, 1).toUpperCase()}
        </span>
      ) : null}
    </div>
  );
}

export function ytCover(youtubeId?: string) {
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined;
}

export function sourceLabel(track: Track) {
  return track.source === "youtube" ? "YouTube" : "Каталог";
}
