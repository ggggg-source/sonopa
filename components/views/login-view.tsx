"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function LoginView() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent, mode: "in" | "up") {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const error = mode === "in" ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setPending(false);
    if (error) setMessage(error);
    else router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-elevated p-6">
        <h1 className="text-3xl font-extrabold">Вход в Sonora</h1>
        <p className="mt-2 text-sm text-muted">
          {auth.configured
            ? "Почта и Google идут через Supabase. Плейлисты и прогресс синхронизируются с аккаунтом."
            : "Ключи Supabase не заданы. Можно слушать в демо-режиме: библиотека останется в этом браузере."}
        </p>
        {auth.user ? (
          <div className="mt-6">
            <p className="font-semibold">{auth.user.name}</p>
            <p className="text-sm text-muted">{auth.user.email}</p>
            <button type="button" onClick={() => auth.signOut()} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
              Выйти
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(event) => submit(event, "in")}>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Эл. почта"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              placeholder="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white"
            />
            {message ? <p className="text-sm text-amber-200">{message}</p> : null}
            <button disabled={pending} className="w-full rounded-full bg-green py-3 font-bold text-black hover:bg-green-hover disabled:opacity-60">
              Войти
            </button>
            <button type="button" disabled={pending} onClick={(event) => submit(event, "up")} className="w-full rounded-full bg-white/10 py-3 font-semibold hover:bg-white/15">
              Создать аккаунт
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                const error = await auth.signInGoogle();
                if (error) setMessage(error);
              }}
              className="w-full rounded-full border border-white/20 py-3 font-semibold hover:bg-white/10"
            >
              Войти через Google
            </button>
            <button
              type="button"
              onClick={() => {
                auth.signInDemo();
                router.push("/");
              }}
              className="w-full text-sm font-semibold text-muted hover:text-white"
            >
              Продолжить как гость
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
