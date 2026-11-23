"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Loader2,
  Mic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CoverArt, ytCover } from "@/components/cover";
import { LyricsPanel } from "@/components/LyricsPanel";
import { useLibrary } from "@/components/library-provider";
import { usePlayback, useProgress } from "@/components/player-provider";
import { formatTime, cn } from "@/lib/format";

function Seek({ className }: { className?: string }) {
  const { seek } = usePlayback();
  const { position, duration } = useProgress();
  const width = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className={cn("group flex items-center gap-2", className)}>
      <span className="w-10 text-right text-xs text-muted">{formatTime(position)}</span>
      <input
        aria-label="Прогресс"
        className="seek"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(position, duration || 0)}
        onChange={(event) => seek(Number(event.target.value))}
        style={{ background: `linear-gradient(to right, #ffffff ${width}%, #4d4d4d ${width}%)` }}
      />
      <span className="w-10 text-xs text-muted">{formatTime(duration)}</span>
    </div>
  );
}

function EqBars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="eq-bar w-[3px] rounded-full bg-white" />
      ))}
    </span>
  );
}

export function Player() {
  const playback = usePlayback();
  const { toggleLike, isLiked } = useLibrary();
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const touchY = useRef<number | null>(null);
  const { current, playing, queue, index } = playback;
  const liked = current ? isLiked(current.id) : false;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Глобальные горячие клавиши (игнорируем при вводе в поля)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === " ") {
        event.preventDefault();
        playback.toggle();
      } else if (event.key === "ArrowLeft") {
        playback.prev();
      } else if (event.key === "ArrowRight") {
        playback.next();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        playback.setVolume(playback.volume + 0.05);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        playback.setVolume(playback.volume - 0.05);
      } else if (event.key.toLowerCase() === "l" && current) {
        setLyricsOpen((v) => !v);
      } else if (event.key.toLowerCase() === "m") {
        playback.toggleMuted();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback, current]);

  const VolumeIcon = playback.muted || playback.volume === 0 ? VolumeX : playback.volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <footer className="shrink-0 border-t border-white/10 px-2 py-2 md:px-4 md:py-3" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        <div className="md:hidden">
          <Seek />
          <button type="button" className="mt-1 flex w-full items-center gap-3 text-left" onClick={() => current && setExpanded(true)}>
            {current ? (
              <span className="relative">
                <CoverArt title={current.title} color={current.coverColor} accent={current.coverAccent} coverUrl={current.coverUrl} fallbackUrl={ytCover(current.youtubeId)} className="h-12 w-12" />
                {playback.buffering ? <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white" /> : null}
              </span>
            ) : (
              <span className="h-12 w-12 rounded-md bg-highlight" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{current?.title ?? "Ничего не играет"}</span>
              <span className="block truncate text-xs text-muted">{current?.artist ?? "Выберите трек"}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label={playing ? "Пауза" : "Слушать"}
              className="rounded-full p-2"
              onClick={(event) => {
                event.stopPropagation();
                playback.toggle();
              }}
            >
              {playing ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white" />}
            </span>
          </button>
          {playback.error ? <p className="px-1 pb-1 text-xs text-red-300">{playback.error}</p> : null}
        </div>

        <div className="hidden items-center gap-4 md:grid md:grid-cols-[1fr_minmax(280px,1.3fr)_1fr]">
          <div className="flex min-w-0 items-center gap-3">
            {current ? (
              <span className="relative">
                <CoverArt title={current.title} color={current.coverColor} accent={current.coverAccent} coverUrl={current.coverUrl} fallbackUrl={ytCover(current.youtubeId)} className="h-14 w-14" />
                {playback.buffering ? <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white" /> : null}
              </span>
            ) : (
              <span className="h-14 w-14 rounded-md bg-highlight" />
            )}
            <div className="flex min-w-0 items-center gap-2">
              {playing ? <EqBars /> : null}
              <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{current?.title ?? "Ничего не играет"}</p>
              <p className="truncate text-xs text-muted">{current?.artist ?? "Sonora"}</p>
              {playback.error ? <p className="truncate text-xs text-red-300">{playback.error}</p> : null}
              </div>
            </div>
            {current ? (
              <button type="button" aria-label="Нравится" onClick={() => toggleLike(current)} className="ml-1 text-muted hover:text-white">
                <Heart className={cn("h-4 w-4", liked && "fill-green text-green")} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-col items-center">
            <Controls onLyrics={() => setLyricsOpen(true)} />
            <Seek className="mt-1 w-full" />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" aria-label="Очередь" onClick={() => setQueueOpen((value) => !value)} className={cn("text-muted hover:text-white", queueOpen && "text-green")}>
              <ListMusic className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Громкость" onClick={playback.toggleMuted} className="text-muted hover:text-white">
              <VolumeIcon className="h-5 w-5" />
            </button>
            <input
              aria-label="Громкость"
              className="seek w-24"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playback.muted ? 0 : playback.volume}
              onChange={(event) => playback.setVolume(Number(event.target.value))}
              style={{ background: `linear-gradient(to right, #fff ${(playback.muted ? 0 : playback.volume) * 100}%, #4d4d4d ${(playback.muted ? 0 : playback.volume) * 100}%)` }}
            />
          </div>
        </div>
      </footer>

      {queueOpen ? (
        <div className="absolute bottom-[92px] right-3 z-30 hidden max-h-80 w-80 overflow-y-auto rounded-lg bg-[#242424] p-2 shadow-lift md:block">
          <p className="px-2 py-2 text-sm font-semibold">Очередь</p>
          {queue.length === 0 ? <p className="px-2 pb-3 text-sm text-muted">Очередь пуста</p> : null}
          {queue.map((track, trackIndex) => (
            <button
              key={`${track.id}-${trackIndex}`}
              type="button"
              onClick={() => playback.playAt(trackIndex)}
              className={cn("flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-white/10", trackIndex === index && "text-green")}
            >
              <span className="min-w-0 flex-1 truncate text-sm">{track.title}</span>
              <span className="truncate text-xs text-muted">{track.artist}</span>
            </button>
          ))}
        </div>
      ) : null}

      {lyricsOpen ? <LyricsPanel track={current} onClose={() => setLyricsOpen(false)} /> : null}

      {expanded && current ? (
        <div
          className="fixed inset-0 z-40 flex flex-col px-5 pb-8 pt-4 md:hidden"
          style={{ background: "linear-gradient(180deg, #1a1a1a, #0a0a0a 58%)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            if (touchY.current != null && e.changedTouches[0].clientY - touchY.current > 100) setExpanded(false);
            touchY.current = null;
          }}
        >
          <button type="button" aria-label="Свернуть" onClick={() => setExpanded(false)} className="self-start rounded-full p-2">
            <ChevronDown className="h-7 w-7" />
          </button>
          <CoverArt title={current.title} color={current.coverColor} accent={current.coverAccent} coverUrl={current.coverUrl} fallbackUrl={ytCover(current.youtubeId)} className="mx-auto mt-6 aspect-square w-full max-w-sm shadow-lift" rounded="rounded-lg" />
          <div className="mt-8 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {playing ? <EqBars /> : null}
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">{current.title}</h2>
                <p className="truncate text-muted">{current.artist}</p>
              </div>
            </div>
            <button type="button" aria-label="Нравится" onClick={() => toggleLike(current)}>
              <Heart className={cn("h-6 w-6", liked && "fill-green text-green")} />
            </button>
          </div>
          <Seek className="mt-6" />
          <div className="mt-4">
            <Controls large onLyrics={() => setLyricsOpen(true)} />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button type="button" aria-label="Громкость" onClick={playback.toggleMuted} className="text-white">
              <VolumeIcon className="h-5 w-5" />
            </button>
            <input
              aria-label="Громкость"
              className="seek w-full"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playback.muted ? 0 : playback.volume}
              onChange={(event) => playback.setVolume(Number(event.target.value))}
              style={{ background: `linear-gradient(to right, #fff ${(playback.muted ? 0 : playback.volume) * 100}%, #4d4d4d ${(playback.muted ? 0 : playback.volume) * 100}%)` }}
            />
          </div>
          {playback.error ? <p className="mt-4 text-sm text-red-200">{playback.error}</p> : null}
        </div>
      ) : null}
    </>
  );
}

function Controls({ large = false, onLyrics }: { large?: boolean; onLyrics?: () => void }) {
  const { shuffle, repeat, playing, toggle, next, prev, toggleShuffle, cycleRepeat } = usePlayback();
  const size = large ? "h-8 w-8" : "h-5 w-5";
  return (
    <div className="flex items-center justify-center gap-5">
      <button type="button" aria-label="Перемешать" onClick={toggleShuffle} className={cn("text-muted hover:text-white", shuffle && "text-green")}>
        <Shuffle className={size} />
      </button>
      <button type="button" aria-label="Предыдущий" onClick={prev} className="text-white">
        <SkipBack className={cn(size, "fill-white")} />
      </button>
      <button type="button" aria-label={playing ? "Пауза" : "Слушать"} onClick={toggle} className={cn("flex items-center justify-center rounded-full bg-white text-black hover:scale-105", large ? "h-16 w-16" : "h-9 w-9")}>
        {playing ? <Pause className={cn(large ? "h-7 w-7" : "h-5 w-5", "fill-black")} /> : <Play className={cn(large ? "ml-1 h-7 w-7" : "ml-0.5 h-5 w-5", "fill-black")} />}
      </button>
      <button type="button" aria-label="Следующий" onClick={next} className="text-white">
        <SkipForward className={cn(size, "fill-white")} />
      </button>
      {onLyrics ? (
        <button type="button" aria-label="Текст песни" onClick={onLyrics} className="text-muted hover:text-white">
          <Mic className={size} />
        </button>
      ) : null}
      <button type="button" aria-label="Повтор" onClick={cycleRepeat} className={cn("text-muted hover:text-white", repeat !== "off" && "text-green")}>
        {repeat === "one" ? <Repeat1 className={size} /> : <Repeat className={size} />}
      </button>
    </div>
  );
}
