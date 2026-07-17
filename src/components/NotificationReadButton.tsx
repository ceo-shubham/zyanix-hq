"use client";
import { useTransition } from "react";
import { markNotificationRead } from "@/app/actions/notifications";

export default function NotificationReadButton({ notificationId }: { notificationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await markNotificationRead(notificationId); })}
      className={`text-xs text-blue-500 hover:text-blue-700 font-medium whitespace-nowrap transition-colors ${isPending ? "opacity-50" : ""}`}
    >
      {isPending ? "..." : "Mark read"}
    </button>
  );
}
