"use client";
import { useState } from "react";

interface Tab { id: string; label: string; }

export default function AdminTabs({
  tabs,
  defaultTab,
  children,
}: {
  tabs: Tab[];
  defaultTab: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(defaultTab);

  // Find child divs by data-tab attribute
  const childArray = (Array.isArray(children) ? children : [children]).filter(Boolean);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              active === tab.id
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels — only render children that have a data-tab prop */}
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
