"use client";

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";
import { getDrawInstance } from "@/lib/map-refs";
import type { ActiveTool } from "@/types";

const tools: {
  id: ActiveTool;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "pan",
    label: "Pan",
    shortcut: "Esc",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
        <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v6" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V8" />
      </svg>
    ),
  },
  {
    id: "polygon",
    label: "Polygon",
    shortcut: "P",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 4.5v7L12 22l-8-8.5v-7z" />
      </svg>
    ),
  },
  {
    id: "line",
    label: "Line",
    shortcut: "L",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20L20 4" />
        <circle cx="4" cy="20" r="2" />
        <circle cx="20" cy="4" r="2" />
      </svg>
    ),
  },
];

interface DrawControlsProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
}

export function DrawControls({ mapRef }: DrawControlsProps) {
  const activeTool = useAppStore((s) => s.activeTool);
  const setActiveTool = useAppStore((s) => s.setActiveTool);
  const clearSelection = useAppStore((s) => s.clearSelection);

  const handleClear = () => {
    const draw = getDrawInstance();
    if (draw) draw.deleteAll();
    const map = mapRef.current;
    if (map) {
      if (map.getLayer("ai-overlay-layer")) map.removeLayer("ai-overlay-layer");
      if (map.getSource("ai-overlay-source")) map.removeSource("ai-overlay-source");
    }
    clearSelection();
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.dragPan.enable();
  }, [mapRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key.toLowerCase()) {
        case "p": setActiveTool("polygon"); break;
        case "l": setActiveTool("line"); break;
        case "escape": setActiveTool("pan"); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTool]);

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-slate-950/70 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-teal-500/15 text-teal-400 shadow-inner shadow-teal-500/10"
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {tool.icon}
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/10 shadow-lg">
                {tool.label}
                <span className="ml-1.5 text-slate-500">{tool.shortcut}</span>
              </span>
            </button>
          );
        })}

        <div className="h-px bg-white/[0.06] mx-1.5" />

        <button
          onClick={handleClear}
          title="Clear"
          className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-slate-900 text-[11px] font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/10 shadow-lg">
            Clear
          </span>
        </button>
      </div>
    </div>
  );
}
