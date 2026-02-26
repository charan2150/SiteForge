"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";

export function LayerManager() {
  const generatedVersions = useAppStore((s) => s.generatedVersions);
  const activeVersionIndex = useAppStore((s) => s.activeVersionIndex);
  const setActiveVersionIndex = useAppStore((s) => s.setActiveVersionIndex);
  const overlayOpacity = useAppStore((s) => s.overlayOpacity);
  const setOverlayOpacity = useAppStore((s) => s.setOverlayOpacity);
  const drawnCoordinates = useAppStore((s) => s.drawnCoordinates);
  const boundingBox = useAppStore((s) => s.boundingBox);
  const addToast = useAppStore((s) => s.addToast);
  const [isSaving, setIsSaving] = useState(false);

  if (generatedVersions.length === 0) return null;

  const activeVersion = generatedVersions[activeVersionIndex];

  const handleExport = () => {
    const canvas = document.querySelector(
      ".mapboxgl-canvas"
    ) as HTMLCanvasElement | null;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `geo-ai-export-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleSave = async () => {
    if (!activeVersion || !drawnCoordinates || !boundingBox) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinates: drawnCoordinates,
          boundingBox,
          prompt: activeVersion.prompt,
          enhancedPrompt: activeVersion.enhancedPrompt,
          stylePreset: activeVersion.stylePreset,
          imageUrl: activeVersion.imageUrl,
          mapCenter: { lng: 0, lat: 0 },
          mapZoom: 16,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      addToast({ type: "success", message: "Project saved successfully!" });
    } catch {
      addToast({
        type: "error",
        message: "Failed to save project. Check your Supabase configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-20 bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 w-80">
      <h3 className="text-sm font-semibold text-white mb-4">Layers</h3>

      {/* Version thumbnails */}
      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1">
        {generatedVersions.map((version, index) => (
          <button
            key={version.id}
            onClick={() => setActiveVersionIndex(index)}
            className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
              index === activeVersionIndex
                ? "border-teal-400 ring-1 ring-teal-400/50"
                : "border-white/10 hover:border-white/30"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={version.imageUrl}
              alt={`Version ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Opacity Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Overlay Opacity</label>
          <span className="text-xs text-slate-400 tabular-nums">
            {Math.round(overlayOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={overlayOpacity}
          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-teal-400 cursor-pointer"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="flex-1 py-3 rounded-xl text-xs font-medium bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
          >
            Export View
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl text-xs font-medium bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/20 transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
