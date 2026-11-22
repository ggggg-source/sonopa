import type { ListeningProgress, Playlist, Track } from "@/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type RemotePlaylist = {
  id: string;
  name: string;
  description: string;
  cover_color: string;
  cover_accent: string;
  items: Playlist["items"];
  created_at: string;
  updated_at: string;
  system: boolean | null;
};

function toPlaylist(row: RemotePlaylist): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    coverColor: row.cover_color,
    coverAccent: row.cover_accent,
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    system: Boolean(row.system),
  };
}

export async function pullRemote(userId: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;

  const [playlistsRes, progressRes] = await Promise.all([
    supabase.from("playlists").select("*").eq("user_id", userId),
    supabase.from("listening_progress").select("*").eq("user_id", userId),
  ]);

  if (playlistsRes.error || progressRes.error) {
    console.warn(playlistsRes.error?.message || progressRes.error?.message);
    return null;
  }

  const progress: Record<string, ListeningProgress> = {};
  for (const row of progressRes.data ?? []) {
    progress[row.track_id as string] = {
      trackId: row.track_id as string,
      position: Number(row.position),
      playlistId: (row.playlist_id as string | null) ?? undefined,
      updatedAt: row.updated_at as string,
    };
  }

  return {
    playlists: ((playlistsRes.data ?? []) as RemotePlaylist[]).map(toPlaylist),
    progress,
  };
}

export async function pushPlaylists(userId: string, playlists: Playlist[]) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const rows = playlists.map((playlist) => ({
    id: playlist.id,
    user_id: userId,
    name: playlist.name,
    description: playlist.description,
    cover_color: playlist.coverColor,
    cover_accent: playlist.coverAccent,
    items: playlist.items,
    created_at: playlist.createdAt,
    updated_at: playlist.updatedAt,
    system: Boolean(playlist.system),
  }));
  const { error } = await supabase.from("playlists").upsert(rows);
  if (error) console.warn(error.message);
}

export async function deleteRemotePlaylist(id: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) console.warn(error.message);
}

export async function pushProgress(userId: string, entry: ListeningProgress) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return;
  const { error } = await supabase.from("listening_progress").upsert({
    user_id: userId,
    track_id: entry.trackId,
    position: entry.position,
    playlist_id: entry.playlistId ?? null,
    updated_at: entry.updatedAt,
  });
  if (error) console.warn(error.message);
}

export function snapshotsFrom(playlists: Playlist[]): Track[] {
  const map = new Map<string, Track>();
  for (const playlist of playlists) {
    for (const item of playlist.items) {
      if (item.snapshot) map.set(item.snapshot.id, item.snapshot);
    }
  }
  return [...map.values()];
}
