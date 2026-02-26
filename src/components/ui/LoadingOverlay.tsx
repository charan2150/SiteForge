"use client";

import { useAppStore } from "@/store/useAppStore";

export function LoadingOverlay() {
  const isGenerating = useAppStore((s) => s.isGenerating);
  const generationStage = useAppStore((s) => s.generationStage);

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
      {/* Subtle full-screen vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-teal-500/5 animate-pulse" />

      {/* Centered loading indicator */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-teal-500/30 rounded-2xl px-8 py-5 flex items-center gap-5 shadow-2xl shadow-teal-500/10">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-teal-400/30 rounded-full" />
          <div className="absolute inset-0 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Processing</p>
          <p className="text-xs text-teal-300/80">{generationStage}</p>
        </div>
      </div>
    </div>
  );
}
