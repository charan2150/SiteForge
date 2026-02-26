"use client";

import { useRef, useEffect } from "react";
import { useMap } from "@/hooks/useMap";
import { useMapDraw } from "@/hooks/useMapDraw";
import { useMapOverlay } from "@/hooks/useMapOverlay";
import { useBuildingOpacity } from "@/hooks/useBuildingOpacity";
import { useAppStore } from "@/store/useAppStore";
import { DrawControls } from "./DrawControls";
import { SearchBar } from "@/components/ui/SearchBar";
import { GenerationSidebar } from "@/components/ui/GenerationSidebar";
import { LayerManager } from "@/components/ui/LayerManager";
import { MapSettings } from "@/components/ui/MapSettings";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ToastContainer } from "@/components/ui/Toast";

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef, flyTo } = useMap(containerRef);
  const activeTool = useAppStore((s) => s.activeTool);
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);

  useMapDraw(mapRef);
  useMapOverlay(mapRef);
  useBuildingOpacity(mapRef);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctrl = container.querySelector(".mapboxgl-ctrl-bottom-right") as HTMLElement | null;
    if (ctrl) {
      ctrl.style.transition = "right 0.3s ease";
      ctrl.style.right = isSidebarOpen ? "412px" : "0";
    }
  }, [isSidebarOpen]);

  const cursorClass =
    activeTool === "polygon" || activeTool === "line"
      ? "cursor-crosshair"
      : "";

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={containerRef} className={`w-full h-full ${cursorClass}`} />

      {/* Top bar: branding + search */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-4 px-5 py-4 pointer-events-none">
        {/* Branding */}
        <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-5 py-2.5 bg-slate-950/70 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-lg shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4.5v7L12 22l-8-8.5v-7z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-white leading-none">
              Site<span className="text-teal-400">Forge</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-medium leading-none mt-0.5">
              Draw. Describe. Visualize.
            </span>
          </div>
        </div>

        {/* Search */}
        <SearchBar flyTo={flyTo} />
      </div>

      <DrawControls mapRef={mapRef} />
      <GenerationSidebar mapRef={mapRef} />
      <LayerManager />
      <MapSettings />
      <LoadingOverlay />
      <ToastContainer />
    </div>
  );
}
