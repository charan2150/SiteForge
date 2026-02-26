"use client";

import { useCallback, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { useAppStore } from "@/store/useAppStore";
import {
  getBboxCenter,
  reverseGeocode,
} from "@/lib/geo-utils";
import { buildPromptForGeneration } from "@/lib/prompt-utils";
import { captureContextImage, captureSiteScreenshot } from "@/lib/mask-utils";
import { STYLE_PRESETS } from "@/lib/constants";
import type { StylePreset } from "@/types";

interface GenerationSidebarProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
}

const PLACEHOLDER_PROMPTS: Record<StylePreset, string> = {
  "top-down":
    "e.g., Large open-cut excavation site with exposed brown earth, steel shoring walls, two yellow excavators, dump trucks, and a concrete foundation being poured at the base",
  "cross-section":
    "e.g., Deep underground cross-section showing layered soil and rock strata, a circular TBM tunnel at 20m depth, adjacent utility conduits, and groundwater table",
  architectural:
    "e.g., Modern glass and steel office tower with ground-floor retail, street trees, outdoor seating area, pedestrians, and evening golden-hour lighting",
};

export function GenerationSidebar({ mapRef }: GenerationSidebarProps) {
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const prompt = useAppStore((s) => s.prompt);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const stylePreset = useAppStore((s) => s.stylePreset);
  const setStylePreset = useAppStore((s) => s.setStylePreset);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const generationStage = useAppStore((s) => s.generationStage);
  const startGeneration = useAppStore((s) => s.startGeneration);
  const setGenerationStage = useAppStore((s) => s.setGenerationStage);
  const finishGeneration = useAppStore((s) => s.finishGeneration);
  const addVersion = useAppStore((s) => s.addVersion);
  const addToast = useAppStore((s) => s.addToast);
  const selectionInfo = useAppStore((s) => s.selectionInfo);
  const drawnCoordinates = useAppStore((s) => s.drawnCoordinates);
  const boundingBox = useAppStore((s) => s.boundingBox);
  const generatedVersions = useAppStore((s) => s.generatedVersions);
  const activeVersionIndex = useAppStore((s) => s.activeVersionIndex);

  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Step 1: Enhance prompt (show to user for editing)
  const handleEnhance = useCallback(async () => {
    if (!drawnCoordinates || !prompt.trim() || !boundingBox) return;
    setIsEnhancing(true);

    try {
      const [lng, lat] = getBboxCenter(boundingBox);

      let contextImage: string | undefined;
      const map = mapRef.current;
      if (map) {
        try {
          contextImage = await captureContextImage(map, boundingBox, 0.25);
        } catch { /* non-critical */ }
      }

      let locationName: string | null = null;
      try {
        locationName = await reverseGeocode(lng, lat);
      } catch { /* non-critical */ }

      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stylePreset,
          locationName: locationName || undefined,
          siteArea: selectionInfo || undefined,
          contextImage,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Enhancement failed");
      }

      const data = await res.json();
      setEnhancedPrompt(data.enhancedPrompt);
    } catch (err) {
      addToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Prompt enhancement failed.",
      });
    } finally {
      setIsEnhancing(false);
    }
  }, [mapRef, drawnCoordinates, boundingBox, prompt, stylePreset, selectionInfo, addToast]);

  // Step 2: Capture map screenshot and send to Gemini for editing
  // Use enhanced prompt if available, otherwise build from template (no LLM call)
  const handleGenerate = useCallback(async () => {
    if (!boundingBox || !prompt.trim()) return;

    const map = mapRef.current;
    if (!map) {
      addToast({ type: "error", message: "Map not available." });
      return;
    }

    const promptToSend =
      enhancedPrompt?.trim() || buildPromptForGeneration(prompt.trim(), stylePreset);

    startGeneration("Capturing site screenshot...");

    try {
      const { dataUrl: mapScreenshot, captureBounds } =
        await captureSiteScreenshot(map, boundingBox, drawnCoordinates ?? undefined);

      setGenerationStage("Sending to Gemini for image editing...");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          mapScreenshot,
        }),
      });

      setGenerationStage("Rendering...");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }

      const data = await res.json();

      addVersion({
        id: `v-${Date.now()}`,
        imageUrl: data.imageUrl,
        prompt: prompt.trim(),
        enhancedPrompt: promptToSend,
        stylePreset,
        timestamp: Date.now(),
        captureBounds,
      });

      addToast({ type: "success", message: "Visualization generated!" });
    } catch (err) {
      addToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Generation failed. Please try adjusting your prompt.",
      });
    } finally {
      finishGeneration();
    }
  }, [
    mapRef,
    boundingBox,
    drawnCoordinates,
    enhancedPrompt,
    prompt,
    stylePreset,
    startGeneration,
    setGenerationStage,
    finishGeneration,
    addVersion,
    addToast,
  ]);

  const canEnhance =
    !!drawnCoordinates &&
    !!boundingBox &&
    prompt.trim().length > 0 &&
    !isEnhancing &&
    !isGenerating;

  const canGenerate =
    !!boundingBox &&
    prompt.trim().length > 0 &&
    !isGenerating &&
    !isEnhancing;

  const latestVersion =
    activeVersionIndex >= 0 ? generatedVersions[activeVersionIndex] : null;

  // When sidebar is closed, show a small tab to reopen it (if there's a selection)
  if (!isSidebarOpen) {
    if (!drawnCoordinates) return null;
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-slate-950/80 backdrop-blur-xl border border-white/[0.08] border-r-0 rounded-l-xl px-2 py-4 text-teal-400 hover:text-teal-300 hover:bg-slate-900/80 transition-all shadow-lg"
        title="Open Generate panel"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full z-20">
      <div className="h-full w-[400px] bg-slate-950/80 backdrop-blur-2xl border-l border-white/[0.06] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400/20 to-teal-600/20 flex items-center justify-center border border-teal-500/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400">
                  <path d="M12 2l4 4-4 4" /><path d="M16 6H4" />
                  <path d="M12 22l-4-4 4-4" /><path d="M8 18h12" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-white">Generate</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Minimize panel"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          {selectionInfo && (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[12px] text-teal-300 font-medium">{selectionInfo}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
          {/* Style Presets */}
          <div>
            <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setStylePreset(preset.value); setEnhancedPrompt(null); }}
                  className={`px-2.5 py-2 rounded-lg text-[10px] font-medium text-center transition-all leading-tight ${
                    stylePreset === preset.value
                      ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/30"
                      : "bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] border border-white/[0.04]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Prompt */}
          <div>
            <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Your Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setEnhancedPrompt(null); }}
              placeholder={PLACEHOLDER_PROMPTS[stylePreset]}
              rows={3}
              className="w-full px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-slate-600 outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 resize-none transition-all leading-relaxed"
            />
          </div>

          {/* Optional enhance — Generate works without it */}
          {!enhancedPrompt ? (
            <button
              onClick={handleEnhance}
              disabled={!canEnhance}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                canEnhance
                  ? "bg-white/[0.04] text-slate-400 hover:text-teal-400 hover:bg-white/[0.06] border border-white/[0.06]"
                  : "bg-white/[0.02] text-slate-600 cursor-not-allowed border border-transparent"
              }`}
            >
              {isEnhancing ? "Improving..." : "Improve with AI (optional)"}
            </button>
          ) : null}

          {/* Enhanced Prompt (editable) */}
          {enhancedPrompt !== null && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Enhanced Prompt</label>
                <button
                  onClick={() => setEnhancedPrompt(null)}
                  className="text-[10px] text-slate-500 hover:text-teal-400 transition-colors"
                >
                  Re-enhance
                </button>
              </div>
              <textarea
                value={enhancedPrompt}
                onChange={(e) => setEnhancedPrompt(e.target.value)}
                rows={6}
                className="w-full px-3.5 py-3 rounded-xl bg-teal-500/[0.04] border border-teal-500/15 text-xs text-slate-300 outline-none focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 resize-none transition-all leading-relaxed"
              />
              <p className="text-[10px] text-slate-600 mt-1.5">Edit freely before generating.</p>
            </div>
          )}

          {/* Generation stage */}
          {isGenerating && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-teal-500/[0.08] border border-teal-500/15">
              <div className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-[12px] text-teal-300/80">{generationStage}</span>
            </div>
          )}

          {/* Generated image preview */}
          {latestVersion && !isGenerating && (
            <div className="space-y-2.5">
              <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Generated Result</label>
              <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={latestVersion.imageUrl} alt="Generated visualization" className="w-full object-cover" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              canGenerate
                ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-500/20"
                : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
            }`}
          >
            {isGenerating ? "Generating..." : "Generate Visualization"}
          </button>
        </div>
      </div>
    </div>
  );
}
