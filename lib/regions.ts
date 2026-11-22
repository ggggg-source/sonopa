import type { Country, Genre, RegionId } from "@/types";

export const genres: Genre[] = [
  { id: "pop", name: "Поп", color: "#E13300" },
  { id: "rap", name: "Рэп", color: "#7358FF" },
  { id: "hiphop", name: "Хип-хоп", color: "#BC5900" },
  { id: "rock", name: "Рок", color: "#E8115B" },
  { id: "electronic", name: "Электроника", color: "#148A08" },
  { id: "indie", name: "Инди", color: "#E91429" },
  { id: "jazz", name: "Джаз", color: "#1E3264" },
  { id: "ambient", name: "Эмбиент", color: "#0D73EC" },
];

export const countries: Country[] = [
  { code: "RU", name: "Россия", region: "cis" },
  { code: "UA", name: "Украина", region: "cis" },
  { code: "KZ", name: "Казахстан", region: "cis" },
  { code: "BY", name: "Беларусь", region: "cis" },
  { code: "UZ", name: "Узбекистан", region: "cis" },
  { code: "DE", name: "Германия", region: "europe" },
  { code: "FR", name: "Франция", region: "europe" },
  { code: "PL", name: "Польша", region: "europe" },
  { code: "ES", name: "Испания", region: "europe" },
  { code: "IT", name: "Италия", region: "europe" },
  { code: "NL", name: "Нидерланды", region: "europe" },
  { code: "SE", name: "Швеция", region: "europe" },
];

export function countriesFor(region: RegionId | "all") {
  if (region === "all") return countries;
  return countries.filter((country) => country.region === region);
}

export function genreName(id: string) {
  return genres.find((genre) => genre.id === id)?.name ?? id;
}
