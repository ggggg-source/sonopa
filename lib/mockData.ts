export type MockTrack = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  album: string;
  genre: string;
  region: "cis" | "europe";
  coverColor: string;
  coverAccent: string;
  explicit?: boolean;
  preview: number;
  youtubeId: string;
};

export type MockPlaylist = {
  id: string;
  name: string;
  description: string;
  cover: string;
  coverColor: string;
  coverAccent: string;
  trackIds: string[];
  system?: boolean;
};

function cover(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/400`;
}

export const tracks: MockTrack[] = [
  { id: "t1", title: "Тихий район", artist: "МАРА", cover: cover("t1"), duration: 198, album: "Районы", genre: "pop", region: "cis", coverColor: "#1DB954", coverAccent: "#0d3b22", preview: 1, youtubeId: "kJQP7kiw5Fk" },
  { id: "t2", title: "Неон над Невой", artist: "Север", cover: cover("t2"), duration: 224, album: "Ночной город", genre: "electronic", region: "cis", coverColor: "#3D91F4", coverAccent: "#0B1E3D", preview: 2, youtubeId: "3JZ_D3ELwOQ" },
  { id: "t3", title: "Степь", artist: "Айсулу", cover: cover("t3"), duration: 186, album: "Горизонт", genre: "indie", region: "cis", coverColor: "#F5A623", coverAccent: "#8C4A12", preview: 3, youtubeId: "dQw4w9WgXcQ" },
  { id: "t4", title: "Ночной маршрут", artist: "Платформа", cover: cover("t4"), duration: 251, album: "Линии", genre: "rock", region: "cis", coverColor: "#E8115B", coverAccent: "#4A1024", preview: 4, youtubeId: "fJ9rUzIMcZQ" },
  { id: "t5", title: "Квартал", artist: "ЛЁД", cover: cover("t5"), duration: 173, album: "Квартал", genre: "rap", region: "cis", coverColor: "#7358FF", coverAccent: "#24185C", explicit: true, preview: 5, youtubeId: "RgKAFK5djSk" },
  { id: "t6", title: "Радио", artist: "Ника Волк", cover: cover("t6"), duration: 207, album: "Частота", genre: "pop", region: "cis", coverColor: "#FF6B6B", coverAccent: "#6B1D1D", preview: 6, youtubeId: "JGwWNGJdvx8" },
  { id: "t7", title: "Алматы, 3:40", artist: "Батыр", cover: cover("t7"), duration: 192, album: "Город", genre: "hiphop", region: "cis", coverColor: "#BC5900", coverAccent: "#3D2208", explicit: true, preview: 7, youtubeId: "OPf0YbXqDm0" },
  { id: "t8", title: "Окна", artist: "Юлия Свет", cover: cover("t8"), duration: 215, album: "Окна", genre: "indie", region: "cis", coverColor: "#1ED760", coverAccent: "#145C32", preview: 8, youtubeId: "60ItHLz5WEA" },
  { id: "t9", title: "Glass Balcony", artist: "Mira Sol", cover: cover("t9"), duration: 241, album: "Open Air", genre: "indie", region: "europe", coverColor: "#4C8DFF", coverAccent: "#142850", preview: 9, youtubeId: "hT_nvWreIhg" },
  { id: "t10", title: "Harbor Lights", artist: "Northline", cover: cover("t10"), duration: 268, album: "Coast", genre: "electronic", region: "europe", coverColor: "#14B8A6", coverAccent: "#083833", preview: 10, youtubeId: "CevxZvSJLk8" },
  { id: "t11", title: "Paper Cities", artist: "Elise Varga", cover: cover("t11"), duration: 203, album: "Paper Cities", genre: "pop", region: "europe", coverColor: "#F472B6", coverAccent: "#5B2142", preview: 11, youtubeId: "kXYiU_JCYtU" },
  { id: "t12", title: "Last Train", artist: "The Quiet Metro", cover: cover("t12"), duration: 234, album: "After Hours", genre: "rock", region: "europe", coverColor: "#94A3B8", coverAccent: "#1E293B", preview: 12, youtubeId: "pRpeEdMmmQ0" },
  { id: "t13", title: "Low Winter", artist: "Jonah Hale", cover: cover("t13"), duration: 312, album: "Low Winter", genre: "ambient", region: "europe", coverColor: "#38BDF8", coverAccent: "#0C4A6E", preview: 13, youtubeId: "WpYeekQkAdc" },
  { id: "t14", title: "Saturday Static", artist: "Kite Club", cover: cover("t14"), duration: 189, album: "Weekend", genre: "electronic", region: "europe", coverColor: "#A3E635", coverAccent: "#365314", preview: 14, youtubeId: "YQHsXMglC9A" },
  { id: "t15", title: "Blue Station", artist: "Amelie Ross", cover: cover("t15"), duration: 276, album: "Departures", genre: "jazz", region: "europe", coverColor: "#818CF8", coverAccent: "#1E1B4B", preview: 15, youtubeId: "09R8_2nJtjg" },
  { id: "t16", title: "Маршрут 12", artist: "ДАЧА", cover: cover("t16"), duration: 211, album: "Электричка", genre: "rock", region: "cis", coverColor: "#FB7185", coverAccent: "#4C0519", preview: 16, youtubeId: "kJQP7kiw5Fk" },
  { id: "t17", title: "Балкон", artist: "Май", cover: cover("t17"), duration: 164, album: "Лето", genre: "pop", region: "cis", coverColor: "#22C55E", coverAccent: "#14532D", preview: 1, youtubeId: "60ItHLz5WEA" },
  { id: "t18", title: "River Market", artist: "Lena Vogt", cover: cover("t18"), duration: 228, album: "Market Day", genre: "indie", region: "europe", coverColor: "#F59E0B", coverAccent: "#78350F", preview: 2, youtubeId: "hT_nvWreIhg" },
];

export const playlists: MockPlaylist[] = [
  {
    id: "liked",
    name: "Любимые треки",
    description: "Треки, которые вы отметили сердцем.",
    cover: cover("liked"),
    coverColor: "#5038A0",
    coverAccent: "#1D1240",
    trackIds: ["t6", "t9", "t2"],
    system: true,
  },
  {
    id: "week",
    name: "Открытия недели",
    description: "Свежий микс из СНГ и Европы — то, с чего стоит начать вечер.",
    cover: cover("week"),
    coverColor: "#1DB954",
    coverAccent: "#0b3d22",
    trackIds: ["t1", "t9", "t5", "t14", "t3", "t11"],
  },
  {
    id: "cis-night",
    name: "Вечер в СНГ",
    description: "Поп, рэп и ночные маршруты.",
    cover: cover("cis-night"),
    coverColor: "#E8115B",
    coverAccent: "#3a0d1c",
    trackIds: ["t1", "t2", "t4", "t5", "t7", "t16", "t8", "t17"],
  },
  {
    id: "europe",
    name: "Europe After Dark",
    description: "Инди, джаз и электроника с европейских сцен.",
    cover: cover("europe"),
    coverColor: "#4C8DFF",
    coverAccent: "#101a33",
    trackIds: ["t9", "t10", "t11", "t12", "t13", "t15", "t18"],
  },
  {
    id: "focus",
    name: "Фокус",
    description: "Ровный фон для работы и дороги.",
    cover: cover("focus"),
    coverColor: "#0D73EC",
    coverAccent: "#071426",
    trackIds: ["t13", "t10", "t2", "t15", "t14"],
  },
  {
    id: "morning",
    name: "Утро",
    description: "Короткий старт дня: светлый поп и инди.",
    cover: cover("morning"),
    coverColor: "#F5A623",
    coverAccent: "#5c3b08",
    trackIds: ["t8", "t17", "t11", "t6", "t18"],
  },
];
