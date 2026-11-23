import { Suspense } from "react";
import { UserProfileView } from "@/components/views/user-profile-view";

export const metadata = { title: "Профиль пользователя — Sonopa" };

export default function UserPage() {
  return (
    <Suspense fallback={<div className="px-6 py-10 text-muted">Загрузка…</div>}>
      <UserProfileView />
    </Suspense>
  );
}
