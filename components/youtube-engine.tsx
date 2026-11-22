"use client";

import { useEffect, useRef } from "react";

type Player = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: unknown) => Player };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    });
  }
  return apiPromise;
}

type Props = {
  videoId: string | null;
  playing: boolean;
  volume: number;
  startToken: number;
  startAt: number;
  onProgress: (position: number, duration: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
  seekRef: React.MutableRefObject<((time: number) => void) | null>;
};

export function YouTubeEngine({ videoId, playing, volume, startToken, startAt, onProgress, onEnded, onError, seekRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const readyRef = useRef(false);
  const videoRef = useRef(videoId);
  const playingRef = useRef(playing);
  const endedRef = useRef(onEnded);
  const errorRef = useRef(onError);
  const progressRef = useRef(onProgress);
  videoRef.current = videoId;
  playingRef.current = playing;
  endedRef.current = onEnded;
  errorRef.current = onError;
  progressRef.current = onProgress;

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    loadYouTubeApi().then(() => {
      if (stopped || !hostRef.current || !window.YT || playerRef.current) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        width: 200,
        height: 200,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            const id = videoRef.current;
            if (!id || !playerRef.current) return;
            playerRef.current.loadVideoById(id);
            if (!playingRef.current) playerRef.current.pauseVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) endedRef.current();
          },
          onError: () => errorRef.current("Это видео нельзя встроить. Выберите другой результат."),
        },
      });
      timer = window.setInterval(() => {
        const player = playerRef.current;
        if (!readyRef.current || !player || !videoRef.current) return;
        const duration = player.getDuration?.() || 0;
        const position = player.getCurrentTime?.() || 0;
        if (duration > 0) progressRef.current(position, duration);
      }, 400);
    });
    return () => {
      stopped = true;
      window.clearInterval(timer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    seekRef.current = (time: number) => playerRef.current?.seekTo(time, true);
  }, [seekRef]);

  useEffect(() => {
    const player = playerRef.current;
    if (!readyRef.current || !player) return;
    if (!videoId) {
      player.pauseVideo();
      return;
    }
    player.loadVideoById(videoId);
    if (startAt > 0) player.seekTo(startAt, true);
    if (!playingRef.current) player.pauseVideo();
  }, [videoId, startToken, startAt]);

  useEffect(() => {
    const player = playerRef.current;
    if (!readyRef.current || !player || !videoId) return;
    if (playing) player.playVideo();
    else player.pauseVideo();
  }, [playing, videoId]);

  useEffect(() => {
    playerRef.current?.setVolume?.(Math.round(Math.min(1, Math.max(0, volume)) * 100));
  }, [volume]);

  return <div ref={hostRef} className="yt-host" aria-hidden />;
}
