"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayback, useProgress } from "@/components/player-provider";
import { cn } from "@/lib/format";
import type { Track } from "@/types";

type SyncedLine = { time: number; text: string };

function parseLrc(source: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  for (const raw of source.split("\n")) {
    const match = raw.match(/\[(\d+):(\d+(?:[.:]\d+)?)\]\s*(.*)/);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2].replace(":", "."));
    const text = match[3].trim();
    if (!text) continue;
    lines.push({ time: minutes * 60 + seconds, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function Skeleton() {
  return (
    <div className="space-y-3 px-5 pt-4">
      {[92, 100, 78, 96, 60, 88, 100, 70].map((width, index) => (
        <div key={index} className="h-3 animate-pulse rounded bg-white/10" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

export function LyricsPanel({ track, onClose }: { track: Track | null; onClose: () => void }) {
  const { position } = useProgress();
  const { seek } = usePlayback();
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState<SyncedLine[] | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!track) return;
    let cancel = false;
    setState("loading");
    setSynced(null);
    setPlain(null);
    (async () => {
      try {
        const params = new URLSearchParams({ artist: track.artist, track: track.title });
        const response = await fetch(`/api/lyrics?${params.toString()}`);
        if (!response.ok) throw new Error("not found");
        const data = (await response.json()) as { syncedLyrics?: string | null; plainLyrics?: string | null };
        if (cancel) return;
        if (data.syncedLyrics) {
          setSynced(parseLrc(data.syncedLyrics));
        } else if (data.plainLyrics) {
          setPlain(data.plainLyrics);
        } else {
          setState("missing");
          return;
        }
        setState("ready");
      } catch {
        if (!cancel) setState("missing");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [track?.id, track?.title, track?.artist]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIndex = useMemo(() => {
    if (!synced?.length) return -1;
    let index = -1;
    for (let i = 0; i < synced.length; i += 1) {
      if (synced[i].time <= position + 0.25) index = i;
      else break;
    }
    return index;
  }, [synced, position]);

  useEffect(() => {
    if (activeIndex < 0) return;
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  if (!track) return null;

  return (
    <aside className="fixed bottom-24 right-0 top-0 z-40 flex w-96 max-w-[calc(100vw-0.5rem)] flex-col border-l border-white/10 bg-[#1a1a1a] shadow-lift">
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Текст песни</p>
          <h2 className="mt-1 truncate text-lg font-bold">{track.title}</h2>
          <p className="truncate text-sm text-muted">{track.artist}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Копировать текст"
            title="Копировать текст"
            onClick={async () => {
              const text = synced?.length ? synced.map((l) => l.text).join("\n") : plain;
              if (!text) return;
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                toast.success("Текст скопирован");
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error("Не удалось скопировать");
              }
            }}
            className="rounded-full p-2 text-muted hover:bg-white/10 hover:text-white"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
          <button type="button" aria-label="Закрыть" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {state === "loading" ? <Skeleton /> : null}
        {state === "missing" ? <p className="pt-6 text-sm text-muted">Текст песни недоступен</p> : null}
        {state === "ready" && synced?.length ? (
          <div className="space-y-1 pt-2">
            {synced.map((line, index) => (
              <p
                key={`${line.time}-${index}`}
                ref={index === activeIndex ? activeRef : undefined}
                onClick={() => seek(line.time)}
                className={cn("cursor-pointer rounded px-1 py-0.5 transition hover:bg-white/10", index === activeIndex ? "text-base font-semibold text-white" : "text-base text-[#b3b3b3]")}
                title="Перемотать к этой строке"
              >
                {line.text}
              </p>
            ))}
          </div>
        ) : null}
        {state === "ready" && !synced?.length && plain ? (
          <p className="whitespace-pre-wrap pt-2 text-sm leading-7 text-white/90">{plain}</p>
        ) : null}
      </div>
    </aside>
  );
}
