"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cachedObjectUrl } from "@/lib/offline";
import { addToHistory } from "@/lib/userHistory";
import type { RepeatMode, Track } from "@/types";
import { useLibrary } from "@/components/library-provider";
import { YouTubeEngine } from "@/components/youtube-engine";

type PlayOptions = { startAt?: number; playlistId?: string };

type PlaybackApi = {
  queue: Track[];
  index: number;
  current: Track | null;
  playlistId?: string;
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  playTrack: (track: Track, queue?: Track[], options?: PlayOptions) => void;
  playAt: (index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMuted: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  subscribeProgress: (listener: (position: number, duration: number) => void) => () => void;
  getProgress: () => { position: number; duration: number };
};

const PlaybackContext = createContext<PlaybackApi | null>(null);

function buildOrder(length: number, currentIndex: number, shuffled: boolean) {
  const rest = Array.from({ length }, (_, index) => index).filter((index) => index !== currentIndex);
  if (shuffled) {
    for (let index = rest.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [rest[index], rest[swap]] = [rest[swap], rest[index]];
    }
  }
  return [currentIndex, ...rest];
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const library = useLibrary();
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytSeek = useRef<((time: number) => void) | null>(null);
  const listeners = useRef(new Set<(position: number, duration: number) => void>());
  const progressRef = useRef({ position: 0, duration: 0 });
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const repeatRef = useRef<RepeatMode>("off");
  const orderRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const playlistRef = useRef<string | undefined>(undefined);
  const saveRef = useRef(library.saveProgress);
  const rememberRef = useRef(library.rememberTrack);
  const lastSave = useRef(0);
  saveRef.current = library.saveProgress;
  rememberRef.current = library.rememberTrack;

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [error, setError] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | undefined>(undefined);
  const [startToken, setStartToken] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  repeatRef.current = repeat;

  const current = queue[index] ?? null;

  const emit = useCallback((position: number, duration: number) => {
    progressRef.current = { position, duration };
    listeners.current.forEach((listener) => listener(position, duration));
  }, []);

  const persist = useCallback((position: number, force = false) => {
    const track = queueRef.current[indexRef.current];
    if (!track || position < 1) return;
    const now = Date.now();
    if (!force && now - lastSave.current < 5000) return;
    lastSave.current = now;
    saveRef.current({
      trackId: track.id,
      position,
      playlistId: playlistRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const seek = useCallback(
    (time: number) => {
      const track = queueRef.current[indexRef.current];
      if (!track) return;
      const nextTime = Math.max(0, time);
      if (track.youtubeId) ytSeek.current?.(nextTime);
      else if (audioRef.current) audioRef.current.currentTime = nextTime;
      emit(nextTime, progressRef.current.duration || track.duration);
    },
    [emit]
  );

  const updateIndex = useCallback((value: number) => {
    indexRef.current = value;
    setIndex(value);
    emit(0, queueRef.current[value]?.duration ?? 0);
  }, [emit]);

  const next = useCallback(() => {
    if (repeatRef.current === "one") {
      seek(0);
      setPlaying(true);
      return;
    }
    const order = orderRef.current;
    const pos = order.indexOf(indexRef.current);
    startRef.current = 0;
    setStartAt(0);
    if (pos >= 0 && pos + 1 < order.length) {
      updateIndex(order[pos + 1]);
      setPlaying(true);
      return;
    }
    if (repeatRef.current === "all" && order.length) {
      updateIndex(order[0]);
      setPlaying(true);
      return;
    }
    setPlaying(false);
    persist(progressRef.current.position, true);
  }, [persist, seek, updateIndex]);

  const prev = useCallback(() => {
    if (progressRef.current.position > 3) {
      seek(0);
      return;
    }
    const order = orderRef.current;
    const pos = order.indexOf(indexRef.current);
    startRef.current = 0;
    setStartAt(0);
    if (pos > 0) {
      updateIndex(order[pos - 1]);
      setPlaying(true);
    } else {
      seek(0);
    }
  }, [seek, updateIndex]);

  const playTrack = useCallback(
    (track: Track, nextQueue?: Track[], options?: PlayOptions) => {
      const list = nextQueue?.length ? nextQueue : [track];
      const found = list.findIndex((item) => item.id === track.id);
      const nextIndex = found >= 0 ? found : 0;
      queueRef.current = list;
      orderRef.current = buildOrder(list.length, nextIndex, shuffle);
      playlistRef.current = options?.playlistId;
      startRef.current = options?.startAt ?? 0;
      setQueue(list);
      setPlaylistId(options?.playlistId);
      setStartAt(options?.startAt ?? 0);
      setStartToken((value) => value + 1);
      setError(null);
      updateIndex(nextIndex);
      setPlaying(true);
      rememberRef.current(track);
      for (const item of list) rememberRef.current(item);
      if (track.source === "youtube" && track.youtubeId) addToHistory(track.youtubeId);
    },
    [shuffle, updateIndex]
  );

  const playAt = useCallback(
    (nextIndex: number) => {
      if (!queueRef.current[nextIndex]) return;
      startRef.current = 0;
      setStartAt(0);
      updateIndex(nextIndex);
      setPlaying(true);
    },
    [updateIndex]
  );

  const toggle = useCallback(() => {
    if (!queueRef.current[indexRef.current]) return;
    setPlaying((value) => !value);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((value) => {
      const nextValue = !value;
      orderRef.current = buildOrder(queueRef.current.length, indexRef.current, nextValue);
      return nextValue;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((value) => (value === "off" ? "all" : value === "all" ? "one" : "off"));
  }, []);

  const setVolume = useCallback((value: number) => {
    const nextValue = Math.min(1, Math.max(0, value));
    setVolumeState(nextValue);
    setMuted(nextValue === 0);
    localStorage.setItem("sonora.volume", String(nextValue));
  }, []);

  const toggleMuted = useCallback(() => setMuted((value) => !value), []);

  useEffect(() => {
    const stored = Number(localStorage.getItem("sonora.volume"));
    if (Number.isFinite(stored) && stored >= 0 && stored <= 1) setVolumeState(stored);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      emit(audio.currentTime, audio.duration || 0);
      persist(audio.currentTime);
    };
    const onMeta = () => emit(audio.currentTime, audio.duration || 0);
    const onEnded = () => next();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [emit, next, persist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current || current.youtubeId) {
      audio.pause();
      return;
    }
    let cancel = false;
    const track = current;
    (async () => {
      const cached = await cachedObjectUrl(track.id).catch(() => null);
      const offline = !navigator.onLine;
      const url = offline ? cached : track.audioUrl || cached;
      if (cancel) return;
      if (!url) {
        setError("Нет сети, и этот трек не сохранён для офлайна");
        setPlaying(false);
        return;
      }
      setError(null);
      const start = startRef.current;
      if (audio.getAttribute("data-track") !== track.id) {
        audio.src = url;
        audio.setAttribute("data-track", track.id);
        if (start > 0) {
          const jump = () => {
            audio.currentTime = start;
            audio.removeEventListener("loadedmetadata", jump);
          };
          audio.addEventListener("loadedmetadata", jump);
          startRef.current = 0;
        }
      } else if (start > 0) {
        audio.currentTime = start;
        startRef.current = 0;
      }
      if (playingRef.current) {
        try {
          await audio.play();
        } catch {
          if (!cancel) setPlaying(false);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [current, startToken]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current || current.youtubeId) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else {
      audio.pause();
      persist(audio.currentTime, true);
    }
  }, [playing, current, persist]);

  useEffect(() => {
    if (!current) {
      document.title = "Sonora";
      return;
    }
    document.title = playing ? `${current.title} • ${current.artist} — Sonora` : "Sonora";
  }, [current, playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        if (target?.closest("button, a")) return;
        event.preventDefault();
        toggle();
      } else if (event.code === "ArrowRight") {
        seek(progressRef.current.position + 5);
      } else if (event.code === "ArrowLeft") {
        seek(progressRef.current.position - 5);
      } else if (event.code === "ArrowUp") {
        event.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seek, setVolume, toggle, volume]);

  const subscribeProgress = useCallback((listener: (position: number, duration: number) => void) => {
    listeners.current.add(listener);
    listener(progressRef.current.position, progressRef.current.duration);
    return () => listeners.current.delete(listener);
  }, []);

  const getProgress = useCallback(() => progressRef.current, []);

  const value = useMemo<PlaybackApi>(
    () => ({
      queue,
      index,
      current,
      playlistId,
      playing,
      volume,
      muted,
      shuffle,
      repeat,
      error,
      playTrack,
      playAt,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMuted,
      toggleShuffle,
      cycleRepeat,
      subscribeProgress,
      getProgress,
    }),
    [
      queue,
      index,
      current,
      playlistId,
      playing,
      volume,
      muted,
      shuffle,
      repeat,
      error,
      playTrack,
      playAt,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleMuted,
      toggleShuffle,
      cycleRepeat,
      subscribeProgress,
      getProgress,
    ]
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
      <YouTubeEngine
        videoId={current?.youtubeId ?? null}
        playing={playing && Boolean(current?.youtubeId)}
        volume={muted ? 0 : volume}
        startToken={startToken}
        startAt={startAt}
        onProgress={emit}
        onEnded={next}
        onError={setError}
        seekRef={ytSeek}
      />
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback должен вызываться внутри PlayerProvider");
  return ctx;
}

export function useProgress() {
  const { subscribeProgress, getProgress } = usePlayback();
  const [value, setValue] = useState(getProgress);
  useEffect(() => subscribeProgress((position, duration) => setValue({ position, duration })), [subscribeProgress]);
  return value;
}
