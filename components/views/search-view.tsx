"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { searchCatalog } from "@/lib/catalog";
import { countriesFor, genreName, genres } from "@/lib/regions";
import { usePlayback } from "@/components/player-provider";
import { TrackTable } from "@/components/track-row";
import { cn } from "@/lib/format";
import type { RegionId, Track } from "@/types";

type RegionFilter = "all" | RegionId;

export function SearchView() {
  const params = useSearchParams();
  const { playTrack } = usePlayback();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [country, setCountry] = useState("RU");
  const [remote, setRemote] = useState<Track[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const genre = params.get("genre") ?? "";

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const local = useMemo(() => searchCatalog(query, region, genre || undefined), [query, region, genre]);
  const artists = useMemo(() => [...new Set(local.map((track) => track.artist))].slice(0, 8), [local]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemote([]);
      setRemoteError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const search = new URLSearchParams({
          q: trimmed,
          regionCode: country,
          region: region === "europe" ? "europe" : "cis",
        });
        const response = await fetch(`/api/search?${search.toString()}`, { signal: controller.signal });
        const data = (await response.json()) as { configured?: boolean; tracks?: Track[]; error?: string };
        setConfigured(Boolean(data.configured));
        setRemote(data.tracks ?? []);
        setRemoteError(data.error ?? null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setRemoteError("Поиск YouTube сейчас недоступен");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, country, region]);

  const chooseRegion = (next: RegionFilter) => {
    setRegion(next);
    const list = countriesFor(next === "all" ? "cis" : next);
    if (next === "europe" && !list.some((item) => item.code === country)) setCountry("DE");
    if (next !== "europe" && !countriesFor("cis").some((item) => item.code === country)) setCountry("RU");
  };

  return (
    <div className="px-4 pb-10 md:px-6">
      <label className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-black md:hidden">
        <Search className="h-5 w-5" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Треки, исполнители" className="w-full bg-transparent outline-none placeholder:text-black/50" />
      </label>
      <label className="mt-2 hidden items-center gap-3 rounded-full bg-white px-5 py-3 text-black md:flex">
        <Search className="h-5 w-5" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Что хочется послушать?" className="w-full bg-transparent text-lg outline-none placeholder:text-black/50" />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["all", "cis", "europe"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => chooseRegion(item)}
            className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", region === item ? "bg-white text-black" : "bg-white/10 text-white")}
          >
            {item === "all" ? "Все регионы" : item === "cis" ? "СНГ" : "Европа"}
          </button>
        ))}
        <select
          aria-label="Страна для YouTube"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm outline-none"
        >
          {countriesFor(region === "all" ? "cis" : region).concat(region === "all" ? countriesFor("europe") : []).map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {genre ? <span className="rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-black">{genreName(genre)}</span> : null}
      </div>

      {!query && !genre ? (
        <div className="mt-8">
          <h2 className="text-2xl font-bold">Жанры</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {genres.map((item) => (
              <button key={item.id} type="button" onClick={() => setQuery(item.name)} className="h-24 rounded-lg p-4 text-left text-lg font-bold" style={{ background: item.color }}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {artists.length > 0 && query.trim() ? (
        <div className="mt-8">
          <h2 className="text-xl font-bold">Исполнители</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {artists.map((artist) => (
              <button key={artist} type="button" onClick={() => setQuery(artist)} className="rounded-full bg-highlight px-4 py-2 text-sm font-semibold hover:bg-white/20">
                {artist}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-xl font-bold">В каталоге</h2>
        {local.length === 0 ? <p className="mt-3 text-sm text-muted">В демо-каталоге ничего не нашлось.</p> : <div className="mt-3"><TrackTable tracks={local} /></div>}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold">YouTube</h2>
        {configured === false ? (
          <p className="mt-3 max-w-xl text-sm text-muted">
            Добавьте `YOUTUBE_API_KEY` в `.env.local`, чтобы искать музыку через YouTube Data API. Воспроизведение идёт официальным плеером YouTube, ролики не скачиваются.
          </p>
        ) : null}
        {loading ? <p className="mt-3 text-sm text-muted">Ищем…</p> : null}
        {remoteError ? <p className="mt-3 text-sm text-red-300">{remoteError}</p> : null}
        {remote.length > 0 ? (
          <div className="mt-3">
            <TrackTable tracks={remote} />
            <button type="button" className="sr-only" onClick={() => remote[0] && playTrack(remote[0], remote)}>
              Слушать результаты
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
