"use client";
import { useTransition } from "react";
import { deleteUser } from "@/app/actions/auth";

export default function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteUser(userId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}
