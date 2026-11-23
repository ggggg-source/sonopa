"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Share2, Trash2, UserPlus, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth-provider";

type Repost = { id: string; type: string; youtube_id: string | null; playlist_id: string | null; title: string; artist: string; cover: string; created_at: string };
type Friendship = { id: string; user_id: string; friend_id: string; friend_name: string; friend_email: string; status: string; created_at: string };
type Suggestion = { id: string; email: string; name: string };

export function SocialPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"reposts" | "friends" | "requests">("reposts");
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || user.provider !== "supabase") return;
    setLoading(true);
    try {
      const [r, f, q, s] = await Promise.all([
        fetch("/api/reposts?limit=50").then((x) => x.json()),
        fetch("/api/friends?status=accepted").then((x) => x.json()),
        fetch("/api/friends/requests").then((x) => x.json()),
        fetch("/api/friends/suggestions").then((x) => x.json()),
      ]);
      setReposts(r.data?.reposts ?? []);
      setFriends((f.data?.friends ?? []).filter((x: Friendship) => x.status === "accepted"));
      setRequests(q.data?.requests ?? []);
      setSuggestions(s.data?.suggestions ?? []);
    } catch {
      toast.error("Не удалось загрузить соцданные");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user || user.provider !== "supabase") {
    return <p className="mt-10 text-sm text-muted">Войдите через Supabase, чтобы видеть репосты и друзей.</p>;
  }

  const act = async (url: string, options?: RequestInit, after?: () => void) => {
    try {
      const res = await fetch(url, options);
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast.error(json.error ?? "Ошибка");
        return;
      }
      after?.();
      void load();
    } catch {
      toast.error("Нет сети");
    }
  };

  const respond = (id: string, status: "accepted" | "rejected") =>
    act("/api/friends", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }, () => toast.success(status === "accepted" ? "Заявка принята" : "Заявка отклонена"));

  const addFriend = (friendId: string) =>
    act("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId }) }, () => toast.success("Запрос отправлен"));

  const removeFriend = (friendId: string) =>
    act(`/api/friends?friendId=${friendId}`, { method: "DELETE" }, () => toast.success("Удалено из друзей"));

  const deleteRepost = (id: string) =>
    act(`/api/reposts?id=${id}`, { method: "DELETE" }, () => setReposts((prev) => prev.filter((r) => r.id !== id)));

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        {([["reposts", "Репосты", Share2], ["friends", "Друзья", Users], ["requests", "Запросы", UserPlus]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-white text-black" : "bg-white/10 text-muted hover:text-white"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === "requests" && requests.length ? <span className="rounded-full bg-white px-1.5 text-xs text-black">{requests.length}</span> : null}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-6 text-sm text-muted">Загрузка…</p> : null}

      {tab === "reposts" ? (
        <div className="mt-4 space-y-2">
          {reposts.length === 0 && !loading ? <p className="text-sm text-muted">Пока нет репостов. Нажмите «Поделиться» на треке.</p> : null}
          {reposts.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-3">
              {r.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.cover} alt={r.title} className="h-10 w-10 rounded-md object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-highlight text-sm font-bold">{(r.title || "?").slice(0, 1)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="truncate text-xs text-muted">{r.artist || (r.type === "playlist" ? "Плейлист" : "")}</p>
              </div>
              {r.youtube_id ? (
                <a href={`https://youtu.be/${r.youtube_id}`} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-white">YouTube</a>
              ) : null}
              <button type="button" onClick={() => deleteRepost(r.id)} aria-label="Удалить репост" className="rounded-full p-2 text-muted hover:bg-highlight hover:text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "friends" ? (
        <div className="mt-4 space-y-2">
          {friends.length === 0 && !loading ? <p className="text-sm text-muted">Друзей пока нет.</p> : null}
          {friends.map((f) => {
            const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
            const name = f.user_id === user.id ? f.friend_name || f.friend_email : f.friend_name || f.friend_email;
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">{(name || "?").slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/users/${otherId}`} className="block truncate text-sm font-semibold hover:underline">{name || otherId.slice(0, 8)}</Link>
                  <p className="truncate text-xs text-muted">{f.friend_email}</p>
                </div>
                <button type="button" onClick={() => removeFriend(otherId)} aria-label="Удалить из друзей" className="rounded-full p-2 text-muted hover:bg-highlight hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {suggestions.length ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-muted">Возможные друзья</p>
              <div className="mt-2 space-y-2">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">{(s.name || s.email || "?").slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/users/${s.id}`} className="block truncate text-sm font-semibold hover:underline">{s.name || s.email}</Link>
                      <p className="truncate text-xs text-muted">{s.email}</p>
                    </div>
                    <button type="button" onClick={() => addFriend(s.id)} aria-label="Добавить в друзья" className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-white/90">
                      <UserPlus className="h-3.5 w-3.5" /> В друзья
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="mt-4 space-y-2">
          {requests.length === 0 && !loading ? <p className="text-sm text-muted">Входящих запросов нет.</p> : null}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">{(r.friend_name || r.friend_email || "?").slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.friend_name || r.friend_email || r.user_id.slice(0, 8)}</p>
                <p className="truncate text-xs text-muted">хочет добавить вас в друзья</p>
              </div>
              <button type="button" onClick={() => respond(r.id, "accepted")} aria-label="Принять" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:bg-white/90">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => respond(r.id, "rejected")} aria-label="Отклонить" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
