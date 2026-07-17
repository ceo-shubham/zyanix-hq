"use client";
import { useTransition } from "react";
import { togglePinNote, deleteNote } from "@/app/actions/notes";

export default function NoteActions({ note }: { note: any }) {
  const [isPending, startTransition] = useTransition();

  const handlePin = () => {
    startTransition(async () => {
      await togglePinNote(note.id, note.pinned);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteNote(note.id);
    });
  };

  return (
    <div className={`flex gap-1.5 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        onClick={handlePin}
        title={note.pinned ? "Unpin" : "Pin note"}
        className={`text-sm transition-colors ${note.pinned ? "text-amber-400" : "text-gray-300 hover:text-amber-400"}`}
      >
        📌
      </button>
      <button
        onClick={handleDelete}
        title="Delete note"
        className="text-gray-300 hover:text-red-400 transition-colors text-xs font-bold"
      >
        ✕
      </button>
    </div>
  );
}
