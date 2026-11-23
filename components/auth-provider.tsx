"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const DEMO_KEY = "sonora.demo-user";

type AuthApi = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInGoogle: () => Promise<string | null>;
  signInAnonymous: () => Promise<string | null>;
  verifyEmailOtp: (email: string, token: string) => Promise<string | null>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

function nameFrom(email?: string | null, meta?: { full_name?: string; name?: string }) {
  return meta?.full_name || meta?.name || email?.split("@")[0] || "Слушатель";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw) as AuthUser);
        } catch {
          localStorage.removeItem(DEMO_KEY);
        }
      }
      setLoading(false);
      return;
    }

    let active = true;
    const upsertProfile = (u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
      void supabase
        .from("profiles")
        .upsert({ id: u.id, email: u.email ?? "", name: nameFrom(u.email, u.user_metadata as { full_name?: string; name?: string }) }, { onConflict: "id" })
        .then(() => undefined);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user;
      if (sessionUser) {
        localStorage.removeItem(DEMO_KEY);
        upsertProfile(sessionUser);
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          name: nameFrom(sessionUser.email, sessionUser.user_metadata),
          provider: "supabase",
        });
      } else {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) {
          try {
            setUser(JSON.parse(raw) as AuthUser);
          } catch {
            localStorage.removeItem(DEMO_KEY);
          }
        }
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.removeItem(DEMO_KEY);
        upsertProfile(session.user);
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: nameFrom(session.user.email, session.user.user_metadata),
          provider: "supabase",
        });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase не настроен. Заполните .env.local или войдите в демо-режиме.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase не настроен. Заполните .env.local или войдите в демо-режиме.";
    // Если активна анонимная/гостевая сессия — выходим, иначе signUp
    // вернёт её вместо создания email-аккаунта
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session) await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.session) return "Аккаунт создан. Если в Supabase включено подтверждение почты, откройте письмо и войдите.";
    return null;
  }, []);

  const signInGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase не настроен. Google-вход работает через провайдер в кабинете Supabase.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    return error ? error.message : null;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase не настроен.";
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    return error ? error.message : null;
  }, []);

  const signInAnonymous = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return "Supabase не настроен.";
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return error.message;
    if (data.user) {
      setUser({ id: data.user.id, email: "", name: "Слушатель", provider: "supabase" });
    }
    return null;
  }, []);

  const signInDemo = useCallback(() => {
    const demo: AuthUser = { id: "demo", email: "demo@sonora.local", name: "Гость", provider: "demo" };
    localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
    setUser(demo);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_KEY);
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, configured, signIn, signUp, signInGoogle, signInAnonymous, verifyEmailOtp, signInDemo, signOut }),
    [user, loading, configured, signIn, signUp, signInGoogle, signInAnonymous, verifyEmailOtp, signInDemo, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри AuthProvider");
  return ctx;
}
