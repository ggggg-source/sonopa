export type RegionId = "cis" | "europe";

export type TrackSource = "catalog" | "youtube";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  region: RegionId;
  duration: number;
  coverColor: string;
  coverAccent: string;
  coverUrl?: string;
  explicit?: boolean;
  source: TrackSource;
  audioUrl?: string;
  youtubeId?: string;
  playcount?: number;
  viewCount?: number;
};

export type PlaylistItem = {
  trackId: string;
  addedAt: string;
  snapshot?: Track;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  coverAccent: string;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
  system?: boolean;
};

export type ListeningProgress = {
  trackId: string;
  position: number;
  updatedAt: string;
  playlistId?: string;
};

export type RepeatMode = "off" | "all" | "one";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: "demo" | "supabase";
};

export type Country = {
  code: string;
  name: string;
  region: RegionId;
};

export type Genre = {
  id: string;
  name: string;
  color: string;
};
