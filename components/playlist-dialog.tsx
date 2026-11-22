"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/components/library-provider";

export function PlaylistDialog() {
  const { editor, closeEditor, createPlaylist, updatePlaylist, deletePlaylist } = useLibrary();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!editor) return;
    if (editor.mode === "edit") {
      setName(editor.playlist.name);
      setDescription(editor.playlist.description);
    } else {
      setName("");
      setDescription("");
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, closeEditor]);

  if (!editor) return null;
  const editing = editor.mode === "edit";
  const locked = editing && editor.playlist.system;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={closeEditor}>
      <form
        role="dialog"
        aria-labelledby="playlist-dialog-title"
        className="w-full max-w-md rounded-xl bg-[#282828] p-5 shadow-lift"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (editing) updatePlaylist(editor.playlist.id, { name, description });
          else createPlaylist(name, description);
        }}
      >
        <h2 id="playlist-dialog-title" className="text-xl font-bold">
          {editing ? "Редактировать плейлист" : "Новый плейлист"}
        </h2>
        <label className="mt-4 block text-sm font-medium">
          Название
          <input
            autoFocus
            value={name}
            disabled={locked}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white"
            placeholder="Мой плейлист"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Описание
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white"
            placeholder="О чём этот плейлист"
          />
        </label>
        <div className="mt-5 flex items-center justify-between gap-3">
          {editing && !locked ? (
            <button type="button" onClick={() => deletePlaylist(editor.playlist.id)} className="text-sm font-semibold text-white/70 hover:text-white">
              Удалить
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={closeEditor} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white/10">
              Отмена
            </button>
            <button type="submit" className="rounded-full bg-green px-4 py-2 text-sm font-bold text-black hover:bg-green-hover">
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
