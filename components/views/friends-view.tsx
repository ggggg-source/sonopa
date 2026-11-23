"use client";

import { SocialPanel } from "@/components/social-panel";

export function FriendsView() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-extrabold">Друзья</h1>
      <p className="mt-2 text-sm text-muted">Репосты, заявки в друзья и рекомендации.</p>
      <SocialPanel />
    </div>
  );
}
