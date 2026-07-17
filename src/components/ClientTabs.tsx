"use client";
import { useState } from "react";

interface Tab { id: string; label: string; }

export default function ClientTabs({
  tabs,
  defaultTab,
  children,
}: {
  tabs: Tab[];
  defaultTab: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);
  const childArray = Array.isArray(children) ? children : [children];

  if (tabs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="font-semibold text-gray-800">No sections enabled</p>
        <p className="text-sm text-gray-400 mt-1">Contact your account manager to enable portal sections.</p>
      </div>
    );
  }

  const childArray = (Array.isArray(children) ? children : [children]).filter(Boolean);

  return (
    <div>
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
              active === tab.id
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {childArray
        .filter((child: any) => child?.props?.["data-tab"] != null)
        .map((child: any) => {
          const tabId = child.props["data-tab"] as string;
          return (
            <div key={tabId} style={{ display: active === tabId ? "block" : "none" }}>
              {child}
            </div>
          );
        })}
    </div>
  );
}
