"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { catalog, catalogTrack, seedPlaylists } from "@/lib/catalog";
import { greetingForHour, formatTime } from "@/lib/format";
import { genres } from "@/lib/regions";
import { getHistory } from "@/lib/userHistory";
import { CoverArt, ytCover } from "@/components/cover";
import { useAuth } from "@/components/auth-provider";
import { useLibrary } from "@/components/library-provider";
import { usePlayback } from "@/components/player-provider";
import { CardGrid, MediaCard, Section } from "@/components/media-card";
import { ChartSection } from "@/components/ChartSection";
import { TrackCard } from "@/components/TrackCard";
import type { Track } from "@/types";

const freshIds = ["t16", "t8", "t14", "t11", "t7", "t13"];

type ChartState = { tracks: Track[]; loading: boolean; error: string | null; demo?: boolean };

const DEMO_NOTICE = "Демо-данные (лимит API исчерпан)";

function demoTracks(): Track[] {
  return freshIds.map((id) => catalog.find((track) => track.id === id)).filter((track): track is Track => Boolean(track));
}

function useChartSection(region: string) {
  const [state, setState] = useState<ChartState>({ tracks: [], loading: true, error: null });
  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/charts?region=${region}&type=tracks`);
      const data = (await response.json()) as { tracks?: Track[]; error?: string; fallback?: boolean };
      const tracks = data.tracks ?? [];
      setState({ tracks, loading: false, error: tracks.length ? null : data.error ?? "Не удалось загрузить чарты", demo: Boolean(data.fallback) });
    } catch {
      setState({ tracks: [], loading: false, error: "Не удалось загрузить чарты" });
    }
  }, [region]);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load };
}

function useRecommendations(mode: "new" | "personal") {
  const [state, setState] = useState<ChartState>({ tracks: [], loading: true, error: null });
  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response =
        mode === "personal"
          ? await fetch("/api/recommendations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seedIds: getHistory().slice(0, 5) }),
            })
          : await fetch("/api/recommendations?mode=new");
      const data = (await response.json()) as { tracks?: Track[]; error?: string };
      const tracks = data.tracks ?? [];
      if (tracks.length) {
        setState({ tracks, loading: false, error: null, demo: false });
      } else {
        // YouTube quota/ошибки — показываем демо-каталог вместо красной ошибки
        setState({ tracks: demoTracks(), loading: false, error: null, demo: true });
      }
    } catch {
      setState({ tracks: demoTracks(), loading: false, error: null, demo: true });
    }
  }, [mode]);
  useEffect(() => {
    void load();
  }, [load]);
  return { ...state, reload: load };
}

export function HomeView() {
  const { user } = useAuth();
  const { playlists, tracksIn, progress, trackById, playlistById } = useLibrary();
  const { playTrack } = usePlayback();
  const [greeting, setGreeting] = useState("Добро пожаловать");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
    const ids = getHistory();
    setHasHistory(ids.length > 0);
    setHistoryIds(ids);
  }, []);

  const resume = useMemo(() => {
    const latest = Object.values(progress).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!latest || latest.position < 5) return null;
    const track = trackById(latest.trackId);
    if (!track) return null;
    return { ...latest, track };
  }, [progress, trackById]);

  const quick = playlists.slice(0, 6);
  const fresh = freshIds.map((id) => catalog.find((track) => track.id === id)).filter((track) => track !== undefined);
  const cis = catalog.filter((track) => track.region === "cis").slice(0, 5);
  const europe = catalog.filter((track) => track.region === "europe").slice(0, 5);

  const [hasHistory, setHasHistory] = useState(false);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const recentTracks = useMemo(
    () => historyIds.map((id) => catalogTrack(id)).filter((track): track is Track => Boolean(track)).slice(0, 10),
    [historyIds]
  );
  const russiaChart = useChartSection("russia");
  const worldChart = useChartSection("global");
  const newReleases = useRecommendations("new");
  const personal = useRecommendations(hasHistory ? "personal" : "new");

  return (
    <div className="px-4 pb-8 md:px-6">
      <h1 className="pt-2 text-3xl font-extrabold tracking-tight">
        {greeting}
        {user ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Демо-каталог играет сразу. Реальные треки из СНГ и Европы подключаются поиском через YouTube Data API — без рекламных блоков в интерфейсе.
      </p>

      {resume ? (
        <button
          type="button"
          onClick={() => {
            const playlist = resume.playlistId ? playlistById(resume.playlistId) : undefined;
            const queue = playlist ? tracksIn(playlist) : [resume.track];
            playTrack(resume.track, queue.length ? queue : [resume.track], { startAt: resume.position, playlistId: playlist?.id });
          }}
          className="mt-6 flex w-full items-center gap-4 rounded-lg bg-white/5 p-3 text-left hover:bg-white/10 md:max-w-xl"
        >
          <CoverArt title={resume.track.title} color={resume.track.coverColor} accent={resume.track.coverAccent} coverUrl={resume.track.coverUrl} fallbackUrl={ytCover(resume.track.youtubeId)} className="h-14 w-14" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs uppercase tracking-wide text-muted">Продолжить</span>
            <span className="block truncate font-semibold">{resume.track.title}</span>
            <span className="text-sm text-muted">{formatTime(resume.position)}</span>
          </span>
          <Play className="h-5 w-5 fill-white" />
        </button>
      ) : null}

      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {quick.map((playlist) => (
          <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group flex items-center gap-3 overflow-hidden rounded-md bg-white/10 pr-3 transition hover:bg-white/20">
            <CoverArt title={playlist.name} color={playlist.coverColor} accent={playlist.coverAccent} className="h-14 w-14" rounded="rounded-none" />
            <span className="min-w-0 flex-1 truncate font-semibold">{playlist.name}</span>
            <button
              type="button"
              aria-label={`Слушать ${playlist.name}`}
              onClick={(event) => {
                event.preventDefault();
                const tracks = tracksIn(playlist);
                if (tracks[0]) playTrack(tracks[0], tracks, { playlistId: playlist.id });
              }}
              className="flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-green text-black opacity-0 shadow-lift transition duration-200 group-hover:scale-100 group-hover:opacity-100"
            >
              <Play className="ml-0.5 h-4 w-4 fill-black" />
            </button>
          </Link>
        ))}
      </div>

      {hasHistory ? (
        <ChartSection
          title="Для вас"
          subtitle="На основе ваших прослушиваний"
          notice={personal.demo ? DEMO_NOTICE : undefined}
          tracks={personal.tracks}
          loading={personal.loading}
          error={personal.error}
          onRetry={personal.reload}
          onPlay={(track, queue) => playTrack(track, queue)}
        />
      ) : null}
      <ChartSection
        title="Хиты России"
        notice={russiaChart.demo ? DEMO_NOTICE : undefined}
        tracks={russiaChart.tracks}
        loading={russiaChart.loading}
        error={russiaChart.error}
        onRetry={russiaChart.reload}
        href="/charts?region=russia"
        onPlay={(track, queue) => playTrack(track, queue)}
      />
      <ChartSection
        title="Мировые хиты"
        notice={worldChart.demo ? DEMO_NOTICE : undefined}
        tracks={worldChart.tracks}
        loading={worldChart.loading}
        error={worldChart.error}
        onRetry={worldChart.reload}
        href="/charts?region=global"
        onPlay={(track, queue) => playTrack(track, queue)}
      />
      <ChartSection
        title="Новинки"
        notice={newReleases.demo ? DEMO_NOTICE : undefined}
        tracks={newReleases.tracks}
        loading={newReleases.loading}
        error={newReleases.error}
        onRetry={newReleases.reload}
        onPlay={(track, queue) => playTrack(track, queue)}
      />

      {recentTracks.length ? (
        <Section title="Недавно прослушанные">
          <CardGrid>
            {recentTracks.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={() => playTrack(track, recentTracks)} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      <div className="mt-10">
        <Section title="Рекомендации">
          <CardGrid>
            {(playlists.length ? playlists : seedPlaylists).slice(0, 5).map((playlist) => (
              <MediaCard
                key={playlist.id}
                title={playlist.name}
                subtitle={playlist.description}
                color={playlist.coverColor}
                accent={playlist.coverAccent}
                href={`/playlist/${playlist.id}`}
                onPlay={() => {
                  const tracks = tracksIn(playlist);
                  if (tracks[0]) playTrack(tracks[0], tracks, { playlistId: playlist.id });
                }}
                onShuffle={() => {
                  const tracks = [...tracksIn(playlist)].sort(() => Math.random() - 0.5);
                  if (tracks[0]) playTrack(tracks[0], tracks, { playlistId: playlist.id });
                }}
              />
            ))}
          </CardGrid>
        </Section>
        <Section title="Новинки" action={<Link href="/search" className="text-sm font-semibold text-muted hover:underline">Ещё</Link>}>
          <CardGrid>
            {fresh.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={() => playTrack(track, fresh)} />
            ))}
          </CardGrid>
        </Section>
        <Section title="Жанры">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {genres.map((genre) => (
              <Link key={genre.id} href={`/search?genre=${genre.id}`} className="relative h-24 overflow-hidden rounded-lg p-4 font-bold" style={{ background: genre.color }}>
                {genre.name}
                <span className="absolute -bottom-3 -right-3 h-16 w-16 rotate-12 rounded-md bg-black/20" />
              </Link>
            ))}
          </div>
        </Section>
        <Section title="Популярно в СНГ">
          <CardGrid>
            {cis.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={() => playTrack(track, cis)} />
            ))}
          </CardGrid>
        </Section>
        <Section title="Популярно в Европе">
          <CardGrid>
            {europe.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={() => playTrack(track, europe)} />
            ))}
          </CardGrid>
        </Section>
      </div>
    </div>
  );
}
