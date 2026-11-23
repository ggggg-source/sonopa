"use client";

import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth-provider";

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInDemo, signInGoogle, verifyEmailOtp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    setPending(true);
    const error = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setPending(false);
    if (error) {
      // Регистрация без сессии = нужно подтверждение по коду из письма
      if (mode === "up" && error.includes("Аккаунт создан")) {
        setOtpSent(true);
        toast.success("Код отправлен на почту");
        return;
      }
      toast.error(error);
      return;
    }
    toast.success(mode === "in" ? "С возвращением!" : "Аккаунт создан");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1a] p-6" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{mode === "in" ? "Вход" : "Регистрация"}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-full p-2 text-muted hover:bg-highlight hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-full bg-black/50 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-full bg-black/50 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-green py-3 text-sm font-bold text-black transition hover:bg-green-hover disabled:opacity-60"
          >
            {pending ? "…" : mode === "in" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
        {otpSent ? (
          <form
            className="mt-4 space-y-3 border-t border-white/10 pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!otp.trim()) return;
              setPending(true);
              const err = await verifyEmailOtp(email, otp.trim());
              setPending(false);
              if (err) {
                toast.error(err);
                return;
              }
              toast.success("Email подтверждён");
              onClose();
            }}
          >
            <p className="text-sm text-muted">Введите код из письма</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="w-full rounded-full bg-black/50 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none ring-1 ring-white/10 focus:ring-white"
            />
            <button type="submit" disabled={pending} className="w-full rounded-full bg-white py-2.5 text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60">
              {pending ? "…" : "Подтвердить"}
            </button>
          </form>
        ) : null}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-sm text-muted hover:text-white">
          {mode === "in" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Вход"}
        </button>
        <button
          type="button"
          onClick={async () => {
            const error = await signInGoogle();
            if (error) toast.error(error);
          }}
          className="mt-3 w-full rounded-full border border-white/20 py-2.5 text-sm font-semibold hover:bg-white/10"
        >
          Войти через Google
        </button>
        <button
          type="button"
          onClick={() => {
            signInDemo();
            toast.success("Гостевой режим");
            onClose();
          }}
          className="mt-2 w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-muted transition hover:border-white/40 hover:text-white"
        >
          Войти как гость (локально)
        </button>
      </div>
    </div>
  );
}
