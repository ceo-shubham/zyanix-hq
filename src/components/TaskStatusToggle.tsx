"use client";
import { useTransition } from "react";
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks";

const statuses = ["todo", "in-progress", "done"];
const statusStyle: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600 border-gray-200",
  "in-progress": "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const statusLabel: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export default function TaskStatusToggle({ task }: { task: any }) {
  const [isPending, startTransition] = useTransition();

  const cycleStatus = () => {
    const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
    startTransition(async () => {
      await updateTaskStatus(task.id, next);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  };

  return (
    <div className={`flex items-center gap-2 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
      <button
        onClick={cycleStatus}
        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${statusStyle[task.status] || statusStyle.todo}`}
      >
        {statusLabel[task.status] || task.status}
      </button>
      <button
        onClick={handleDelete}
        className="text-gray-300 hover:text-red-400 transition-colors text-xs"
        title="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
