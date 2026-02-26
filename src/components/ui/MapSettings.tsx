"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export function MapSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const buildingOpacity = useAppStore((s) => s.buildingOpacity);
  const setBuildingOpacity = useAppStore((s) => s.setBuildingOpacity);
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);

  const rightOffset = isSidebarOpen ? "right-[412px]" : "right-3";

  return (
    <div className={`fixed bottom-28 ${rightOffset} z-20 flex flex-col items-end gap-2 transition-all duration-300`}>
      {isOpen && (
        <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-4 w-56 animate-fade-in">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Map Settings
          </h4>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400">3D Buildings</label>
              <span className="text-xs text-slate-500 tabular-nums">
                {Math.round(buildingOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={buildingOpacity}
              onChange={(e) => setBuildingOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-teal-400 cursor-pointer"
            />
          </div>

          <p className="text-[10px] text-slate-600 mt-4 leading-relaxed">
            Right-click + drag to orbit. Scroll to zoom. Hold Ctrl + drag to change pitch.
          </p>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Map Settings"
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
            : "bg-slate-950/70 backdrop-blur-2xl text-slate-400 border border-white/[0.08] hover:text-white hover:bg-slate-900/80"
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
