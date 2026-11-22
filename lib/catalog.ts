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
  coverUrl: track.cover,
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
  ["#1DB954", "#0d3b22"],
  ["#E8115B", "#3a0d1c"],
  ["#7358FF", "#24185C"],
  ["#F5A623", "#5c3b08"],
  ["#14B8A6", "#083833"],
  ["#F472B6", "#5B2142"],
  ["#38BDF8", "#0C4A6E"],
  ["#FB7185", "#4C0519"],
];
