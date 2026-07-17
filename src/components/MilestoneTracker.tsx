"use client";
import React, { useTransition } from "react";
import { toggleMilestone } from "@/app/actions/milestones";

const milestoneConfig = [
  { key: "m1_deposit_30", label: "Deposit 30%", short: "M1" },
  { key: "m2_development_30", label: "Dev 30%", short: "M2" },
  { key: "m3_delivery_40", label: "Delivery 40%", short: "M3" },
];

export default function MilestoneTracker({ project }: any) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: string, current: string) => {
    startTransition(async () => {
      await toggleMilestone(project.id, key, current);
    });
  };

  const milestones = milestoneConfig.map((m) => ({
    ...m,
    status: project[m.key] as string,
  }));

  const paidCount = milestones.filter((m) => m.status === "paid").length;
  const progress = Math.round((paidCount / milestones.length) * 100);

  return (
    <div className={`w-full ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 w-8 text-right">{progress}%</span>
      </div>
      {/* Milestone buttons */}
      <div className="flex gap-2 flex-wrap">
        {milestones.map((m) => (
          <button
            key={m.key}
            onClick={() => handleToggle(m.key, m.status)}
            title={m.status === "paid" ? `${m.label} — Paid ✓` : `${m.label} — Click to mark paid`}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border font-medium transition-all duration-200 ${
              m.status === "paid"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                m.status === "paid" ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
            {m.short}: {m.status === "paid" ? "Paid" : "Pending"}
          </button>
        ))}
      </div>
    </div>
  );
}
