"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-6 py-16">
      <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
      <button type="button" onClick={reset} className="mt-4 rounded-full bg-white px-4 py-2 font-semibold text-black">
        Повторить
      </button>
    </div>
  );
}
