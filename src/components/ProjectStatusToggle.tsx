"use client";
import { useTransition } from "react";
import { updateProjectStatus } from "@/app/actions/projects";

const statuses = ["active", "paused", "completed"];
const statusStyle: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ProjectStatusToggle({ project }: { project: any }) {
  const [isPending, startTransition] = useTransition();

  const cycleStatus = () => {
    const next = statuses[(statuses.indexOf(project.status) + 1) % statuses.length];
    startTransition(async () => {
      await updateProjectStatus(project.id, next);
    });
  };

  return (
    <button
      onClick={cycleStatus}
      disabled={isPending}
      className={`px-2.5 py-1 text-xs rounded-full border font-medium capitalize transition-all ${statusStyle[project.status] || statusStyle.active} ${isPending ? "opacity-50" : "hover:opacity-80"}`}
    >
      {project.status}
    </button>
  );
}
