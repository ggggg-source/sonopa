"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { catalogTrack, coverPalette, seedPlaylists } from "@/lib/catalog";
import { deleteAudio, putAudio } from "@/lib/offline";
import { deleteRemotePlaylist, pullRemote, pushPlaylists, pushProgress, snapshotsFrom } from "@/lib/sync";
import type { ListeningProgress, Playlist, Track } from "@/types";
import { useAuth } from "@/components/auth-provider";

const STORAGE_KEY = "sonora.library.v1";

type Persisted = {
  playlists: Playlist[];
  extraTracks: Track[];
  progress: Record<string, ListeningProgress>;
  offlineIds: string[];
};

type Editor = { mode: "create" } | { mode: "edit"; playlist: Playlist } | null;

type LibraryApi = {
  ready: boolean;
  playlists: Playlist[];
  progress: Record<string, ListeningProgress>;
  offlineIds: string[];
  cachingId: string | null;
  notice: string | null;
  editor: Editor;
  openCreate: () => void;
  openEdit: (playlist: Playlist) => void;
  closeEditor: () => void;
  trackById: (id: string) => Track | undefined;
  playlistById: (id: string) => Playlist | undefined;
  tracksIn: (playlist: Playlist) => Track[];
  createPlaylist: (name: string, description: string) => Playlist;
  updatePlaylist: (id: string, patch: { name?: string; description?: string }) => void;
  deletePlaylist: (id: string) => void;
  addTrack: (playlistId: string, track: Track) => void;
  removeTrack: (playlistId: string, trackId: string) => void;
  toggleLike: (track: Track) => void;
  isLiked: (trackId: string) => boolean;
  rememberTrack: (track: Track) => void;
  saveProgress: (entry: ListeningProgress) => void;
  toggleOffline: (playlistId: string) => Promise<void>;
};

const LibraryContext = createContext<LibraryApi | null>(null);

function emptyState(): Persisted {
  return { playlists: seedPlaylists, extraTracks: [], progress: {}, offlineIds: [] };
}

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const playlists = parsed.playlists?.length ? parsed.playlists : seedPlaylists;
    const hasLiked = playlists.some((playlist) => playlist.id === "liked");
    return {
      playlists: hasLiked ? playlists : [seedPlaylists[0], ...playlists],
      extraTracks: parsed.extraTracks ?? [],
      progress: parsed.progress ?? {},
      offlineIds: parsed.offlineIds ?? [],
    };
  } catch {
    return emptyState();
  }
}

function lookup(state: Persisted, id: string, snapshot?: Track) {
  return snapshot || state.extraTracks.find((track) => track.id === id) || catalogTrack(id);
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Persisted>(emptyState);
  const [ready, setReady] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [cachingId, setCachingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!ready || user?.provider !== "supabase") {
      setSyncReady(false);
      return;
    }
    let cancel = false;
    pullRemote(user.id).then((remote) => {
      if (cancel || !remote) {
        if (!cancel) setSyncReady(true);
        return;
      }
      setState((current) => {
        const map = new Map(current.playlists.map((playlist) => [playlist.id, playlist]));
        for (const playlist of remote.playlists) {
          const local = map.get(playlist.id);
          if (!local || playlist.updatedAt > local.updatedAt) map.set(playlist.id, playlist);
        }
        const progress = { ...remote.progress };
        for (const [id, entry] of Object.entries(current.progress)) {
          if (!progress[id] || entry.updatedAt > progress[id].updatedAt) progress[id] = entry;
        }
        const extra = new Map(current.extraTracks.map((track) => [track.id, track]));
        for (const track of snapshotsFrom([...map.values()])) extra.set(track.id, track);
        return { ...current, playlists: [...map.values()], progress, extraTracks: [...extra.values()] };
      });
      setSyncReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [ready, user?.id, user?.provider]);

  useEffect(() => {
    if (!syncReady || user?.provider !== "supabase") return;
    const timer = window.setTimeout(() => {
      void pushPlaylists(user.id, state.playlists);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state.playlists, syncReady, user?.id, user?.provider]);

  const trackById = useCallback((id: string) => lookup(state, id), [state]);

  const playlistById = useCallback((id: string) => state.playlists.find((playlist) => playlist.id === id), [state.playlists]);

  const tracksIn = useCallback(
    (playlist: Playlist) =>
      playlist.items
        .map((item) => lookup(state, item.trackId, item.snapshot))
        .filter((track): track is Track => Boolean(track)),
    [state]
  );

  const createPlaylist = useCallback((name: string, description: string) => {
    const [coverColor, coverAccent] = coverPalette[Math.floor(Math.random() * coverPalette.length)];
    const timestamp = new Date().toISOString();
    const playlist: Playlist = {
      id: `pl_${crypto.randomUUID()}`,
      name: name.trim() || "Новый плейлист",
      description: description.trim(),
      coverColor,
      coverAccent,
      items: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setState((current) => ({ ...current, playlists: [playlist, ...current.playlists] }));
    setEditor(null);
    setNotice(`Плейлист «${playlist.name}» создан`);
    return playlist;
  }, []);

  const updatePlaylist = useCallback((id: string, patch: { name?: string; description?: string }) => {
    setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => {
        if (playlist.id !== id) return playlist;
        return {
          ...playlist,
          name: playlist.system ? playlist.name : patch.name?.trim() || playlist.name,
          description: patch.description?.trim() ?? playlist.description,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    setEditor(null);
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      playlists: current.playlists.filter((playlist) => playlist.system || playlist.id !== id),
      offlineIds: current.offlineIds.filter((playlistId) => playlistId !== id),
    }));
    if (userRef.current?.provider === "supabase") void deleteRemotePlaylist(id);
    setEditor(null);
    setNotice("Плейлист удалён");
  }, []);

  const addTrack = useCallback((playlistId: string, track: Track) => {
    setState((current) => {
      const extraTracks =
        track.source === "catalog" || current.extraTracks.some((item) => item.id === track.id)
          ? current.extraTracks
          : [track, ...current.extraTracks].slice(0, 200);
      return {
        ...current,
        extraTracks,
        playlists: current.playlists.map((playlist) => {
          if (playlist.id !== playlistId || playlist.items.some((item) => item.trackId === track.id)) return playlist;
          return {
            ...playlist,
            updatedAt: new Date().toISOString(),
            items: [
              ...playlist.items,
              {
                trackId: track.id,
                addedAt: new Date().toISOString(),
                snapshot: track.source === "catalog" ? undefined : track,
              },
            ],
          };
        }),
      };
    });
    setNotice(`«${track.title}» добавлен в плейлист`);
  }, []);

  const removeTrack = useCallback((playlistId: string, trackId: string) => {
    setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, items: playlist.items.filter((item) => item.trackId !== trackId), updatedAt: new Date().toISOString() }
          : playlist
      ),
    }));
  }, []);

  const toggleLike = useCallback((track: Track) => {
    const likedNow = stateRef.current?.playlists.find((p) => p.id === "liked")?.items.some((i) => i.trackId === track.id);
    toast.success(likedNow ? "Удалено из любимых" : "Добавлено в любимые");
    // Синхронизация с сервером для авторизованных (fire-and-forget)
    if (userRef.current?.provider === "supabase" && track.youtubeId) {
      const url = likedNow ? `/api/user/likes?youtube_id=${encodeURIComponent(track.youtubeId)}` : "/api/user/likes";
      void fetch(url, {
        method: likedNow ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: likedNow ? undefined : JSON.stringify({ youtube_id: track.youtubeId, title: track.title, artist: track.artist, cover: track.coverUrl }),
      }).catch(() => undefined);
    }
    setState((current) => {
      const extraTracks =
        track.source === "catalog" || current.extraTracks.some((item) => item.id === track.id)
          ? current.extraTracks
          : [track, ...current.extraTracks].slice(0, 200);
      return {
        ...current,
        extraTracks,
        playlists: current.playlists.map((playlist) => {
          if (playlist.id !== "liked") return playlist;
          const exists = playlist.items.some((item) => item.trackId === track.id);
          return {
            ...playlist,
            updatedAt: new Date().toISOString(),
            items: exists
              ? playlist.items.filter((item) => item.trackId !== track.id)
              : [...playlist.items, { trackId: track.id, addedAt: new Date().toISOString(), snapshot: track.source === "catalog" ? undefined : track }],
          };
        }),
      };
    });
  }, []);

  const isLiked = useCallback(
    (trackId: string) => state.playlists.find((playlist) => playlist.id === "liked")?.items.some((item) => item.trackId === trackId) ?? false,
    [state.playlists]
  );

  const rememberTrack = useCallback((track: Track) => {
    if (track.source === "catalog") return;
    setState((current) =>
      current.extraTracks.some((item) => item.id === track.id)
        ? current
        : { ...current, extraTracks: [track, ...current.extraTracks].slice(0, 200) }
    );
  }, []);

  const saveProgress = useCallback((entry: ListeningProgress) => {
    setState((current) => ({ ...current, progress: { ...current.progress, [entry.trackId]: entry } }));
    if (userRef.current?.provider === "supabase") void pushProgress(userRef.current.id, entry);
  }, []);

  const toggleOffline = useCallback(
    async (playlistId: string) => {
      const playlist = state.playlists.find((item) => item.id === playlistId);
      if (!playlist) return;
      if (state.offlineIds.includes(playlistId)) {
        const stillNeeded = new Set(
          state.playlists
            .filter((item) => item.id !== playlistId && state.offlineIds.includes(item.id))
            .flatMap((item) => item.items.map((entry) => entry.trackId))
        );
        await Promise.all(
          playlist.items
            .map((item) => item.trackId)
            .filter((id) => !stillNeeded.has(id))
            .map((id) => deleteAudio(id).catch(() => undefined))
        );
        setState((current) => ({ ...current, offlineIds: current.offlineIds.filter((id) => id !== playlistId) }));
        setNotice("Офлайн-копия удалена");
        return;
      }

      setCachingId(playlistId);
      const tracks = tracksIn(playlist);
      let saved = 0;
      let skipped = 0;
      for (const track of tracks) {
        if (!track.audioUrl || track.source === "youtube") {
          skipped += 1;
          continue;
        }
        try {
          const response = await fetch(track.audioUrl);
          if (!response.ok) throw new Error("bad status");
          await putAudio(track.id, await response.blob());
          saved += 1;
        } catch {
          skipped += 1;
        }
      }
      setState((current) => ({ ...current, offlineIds: [...current.offlineIds, playlistId] }));
      setCachingId(null);
      setNotice(
        skipped
          ? `Офлайн: ${saved} треков. ${skipped} остались только онлайн — YouTube не скачивается.`
          : `Плейлист сохранён офлайн (${saved})`
      );
    },
    [state.offlineIds, state.playlists, tracksIn]
  );

  const value = useMemo<LibraryApi>(
    () => ({
      ready,
      playlists: state.playlists,
      progress: state.progress,
      offlineIds: state.offlineIds,
      cachingId,
      notice,
      editor,
      openCreate: () => setEditor({ mode: "create" }),
      openEdit: (playlist) => setEditor({ mode: "edit", playlist }),
      closeEditor: () => setEditor(null),
      trackById,
      playlistById,
      tracksIn,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addTrack,
      removeTrack,
      toggleLike,
      isLiked,
      rememberTrack,
      saveProgress,
      toggleOffline,
    }),
    [
      ready,
      state.playlists,
      state.progress,
      state.offlineIds,
      cachingId,
      notice,
      editor,
      trackById,
      playlistById,
      tracksIn,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addTrack,
      removeTrack,
      toggleLike,
      isLiked,
      rememberTrack,
      saveProgress,
      toggleOffline,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary должен вызываться внутри LibraryProvider");
  return ctx;
}
