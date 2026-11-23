"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, UserPlus, Users, Share2, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth-provider";

type ProfileData = { user: { id: string; email?: string; name?: string }; stats: { reposts: number; friends: number; likes: number } };
type Repost = { id: string; title: string; artist: string; cover: string; youtube_id: string | null; created_at: string };

export function UserProfileView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [relation, setRelation] = useState<"none" | "friends" | "pending_out" | "pending_in">("none");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        fetch(`/api/users/${id}`).then((x) => x.json()),
        fetch(`/api/reposts?userId=${id}&limit=30`).then((x) => x.json()),
      ]);
      setData(p.data ?? null);
      setReposts(r.data?.reposts ?? []);
    } catch {
      toast.error("Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || user.provider !== "supabase" || !id) return;
    void (async () => {
      const res = await fetch("/api/friends").then((x) => x.json()).catch(() => null);
      const list = res?.data?.friends ?? [];
      const rel = list.find((f: { user_id: string; friend_id: string; status: string }) =>
        (f.user_id === user.id && f.friend_id === id) || (f.friend_id === user.id && f.user_id === id)
      );
      if (!rel) return setRelation("none");
      if (rel.status === "accepted") setRelation("friends");
      else if (rel.user_id === user.id) setRelation("pending_out");
      else setRelation("pending_in");
    })();
  }, [user, id]);

  if (loading) return <div className="px-6 py-10 text-muted">Загрузка…</div>;
  if (!data) return <div className="px-6 py-10 text-muted">Пользователь не найден</div>;

  const name = data.user.name || data.user.email || id.slice(0, 8);
  const letter = name.slice(0, 1).toUpperCase();
  const isSelf = user?.id === id;

  const act = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const json = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || json.success === false) {
      toast.error(json.error ?? "Ошибка");
      return false;
    }
    return true;
  };

  const addFriend = async () => {
    if (!user || user.provider !== "supabase") {
      toast("Войдите, чтобы добавить в друзья");
      return;
    }
    const okRes = await act("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: id }),
    });
    if (okRes) {
      setRelation("pending_out");
      toast.success("Запрос отправлен");
    }
  };

  const respond = async (status: "accepted" | "rejected") => {
    const res = await fetch("/api/friends").then((x) => x.json()).catch(() => null);
    const rel = (res?.data?.friends ?? []).find(
      (f: { user_id: string; friend_id: string; status: string }) => f.user_id === id && f.friend_id === user?.id
    );
    if (!rel) return;
    const okRes = await act("/api/friends", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rel.id, status }),
    });
    if (okRes) {
      setRelation(status === "accepted" ? "friends" : "none");
      toast.success(status === "accepted" ? "Теперь вы друзья" : "Запрос отклонён");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>
      <div className="flex items-center gap-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-black text-black">{letter}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-extrabold">{name}</h1>
          {data.user.email ? <p className="truncate text-muted">{data.user.email}</p> : null}
        </div>
        {!isSelf ? (
          relation === "friends" ? (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-muted"><Check className="h-4 w-4" /> В друзьях</span>
          ) : relation === "pending_out" ? (
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-muted">Запрос отправлен</span>
          ) : relation === "pending_in" ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => respond("accepted")} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90">Принять</button>
              <button type="button" onClick={() => respond("rejected")} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-muted hover:text-white">Отклонить</button>
            </div>
          ) : (
            <button type="button" onClick={addFriend} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-black hover:bg-white/90">
              <UserPlus className="h-4 w-4" /> В друзья
            </button>
          )
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <Share2 className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{data.stats.reposts}</p>
          <p className="text-xs text-muted">репостов</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{data.stats.friends}</p>
          <p className="text-xs text-muted">друзей</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4 text-center">
          <Heart className="mx-auto h-5 w-5 text-white" />
          <p className="mt-2 text-2xl font-bold">{data.stats.likes}</p>
          <p className="text-xs text-muted">лайков</p>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold">Репосты</h2>
      <div className="mt-3 space-y-2">
        {reposts.length === 0 ? <p className="text-sm text-muted">Репостов пока нет.</p> : null}
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
              <p className="truncate text-xs text-muted">{r.artist}</p>
            </div>
            {r.youtube_id ? (
              <a href={`https://youtu.be/${r.youtube_id}`} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-white">YouTube</a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
