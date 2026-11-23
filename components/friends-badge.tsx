"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// Бейдж с количеством входящих заявок в друзья (только для supabase-пользователей)
export function FriendsBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || user.provider !== "supabase") {
      setCount(0);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const supabase = getSupabaseBrowser();
        if (!supabase) return;
        const { count: c } = await supabase
          .from("friends")
          .select("*", { count: "exact", head: true })
          .eq("friend_id", user.id)
          .eq("status", "pending");
        if (active) setCount(c ?? 0);
      } catch {
        // таблица может быть ещё не создана — молча игнорируем
      }
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  if (!count) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
      {count > 99 ? "99+" : count}
    </span>
  );
}
