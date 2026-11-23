import type { Playlist, Track } from "@/types";
import { playlists, tracks, type MockPlaylist } from "@/lib/mockData";

const now = "2026-11-01T12:00:00.000Z";

export const catalog: Track[] = tracks.map((track) => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  album: track.album,
  genre: track.genre,
  region: track.region,
  duration: track.duration,
  coverColor: track.coverColor,
  coverAccent: track.coverAccent,
  // Обложка — превью YouTube-видео; picsum убран (цель: реальные обложки без внешних зависимостей)
  coverUrl: track.youtubeId ? `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg` : undefined,
  explicit: track.explicit,
  youtubeId: track.youtubeId,
  source: "catalog",
  audioUrl: `/api/audio/${track.id}`,
}));

const remoteById = Object.fromEntries(
  tracks.map((track) => [track.id, `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${track.preview}.mp3`])
);

export function remoteAudioFor(id: string) {
  return remoteById[id] ?? null;
}

export function catalogTrack(id: string) {
  return catalog.find((track) => track.id === id);
}

export function tracksByRegion(region: Track["region"]) {
  return catalog.filter((track) => track.region === region);
}

export function searchCatalog(query: string, region: "all" | Track["region"] = "all", genre?: string) {
  const needle = query.trim().toLowerCase();
  return catalog.filter((track) => {
    if (region !== "all" && track.region !== region) return false;
    if (genre && track.genre !== genre) return false;
    if (!needle) return true;
    return [track.title, track.artist, track.album, track.genre].some((field) => field.toLowerCase().includes(needle));
  });
}

function toPlaylist(playlist: MockPlaylist): Playlist {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    coverColor: playlist.coverColor,
    coverAccent: playlist.coverAccent,
    items: playlist.trackIds.map((trackId) => ({ trackId, addedAt: now })),
    createdAt: now,
    updatedAt: now,
    system: playlist.system,
  };
}

export const seedPlaylists: Playlist[] = playlists.map(toPlaylist);

export const coverPalette = [
  ["#ffffff", "#3a3a3a"],
  ["#d4d4d4", "#262626"],
  ["#a3a3a3", "#1c1c1c"],
  ["#f5f5f5", "#333333"],
  ["#e5e5e5", "#2e2e2e"],
  ["#b3b3b3", "#242424"],
  ["#cfcfcf", "#303030"],
  ["#9a9a9a", "#202020"],
];
