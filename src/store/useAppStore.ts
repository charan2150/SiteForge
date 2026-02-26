import { create } from "zustand";
import type {
  ActiveTool,
  BoundingBox,
  GeneratedVersion,
  StylePreset,
  ToastMessage,
} from "@/types";

interface AppState {
  // Drawing
  activeTool: ActiveTool;
  drawnCoordinates: number[][] | null;
  drawnGeometryType: "polygon" | "line" | null;
  boundingBox: BoundingBox | null;
  selectionInfo: string | null;

  // Generation
  prompt: string;
  stylePreset: StylePreset;
  isGenerating: boolean;
  generationStage: string;
  generatedVersions: GeneratedVersion[];
  activeVersionIndex: number;
  overlayOpacity: number;

  // Map controls
  buildingOpacity: number;

  // UI
  isSidebarOpen: boolean;
  toasts: ToastMessage[];

  // Drawing actions
  setActiveTool: (tool: ActiveTool) => void;
  setDrawnCoordinates: (
    coords: number[][] | null,
    type: "polygon" | "line" | null
  ) => void;
  setBoundingBox: (bbox: BoundingBox | null) => void;
  setSelectionInfo: (info: string | null) => void;
  clearSelection: () => void;

  // Generation actions
  setPrompt: (prompt: string) => void;
  setStylePreset: (preset: StylePreset) => void;
  startGeneration: (stage?: string) => void;
  setGenerationStage: (stage: string) => void;
  finishGeneration: () => void;
  addVersion: (version: GeneratedVersion) => void;
  setActiveVersionIndex: (index: number) => void;
  setOverlayOpacity: (opacity: number) => void;

  // Map control actions
  setBuildingOpacity: (opacity: number) => void;

  // UI actions
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Drawing state
  activeTool: null,
  drawnCoordinates: null,
  drawnGeometryType: null,
  boundingBox: null,
  selectionInfo: null,

  // Generation state
  prompt: "",
  stylePreset: "top-down",
  isGenerating: false,
  generationStage: "",
  generatedVersions: [],
  activeVersionIndex: -1,
  overlayOpacity: 0.85,

  // Map controls
  buildingOpacity: 0.85,

  // UI state
  isSidebarOpen: false,
  toasts: [],

  // Drawing actions
  setActiveTool: (tool) => set({ activeTool: tool }),

  setDrawnCoordinates: (coords, type) =>
    set({ drawnCoordinates: coords, drawnGeometryType: type }),

  setBoundingBox: (bbox) => set({ boundingBox: bbox }),

  setSelectionInfo: (info) => set({ selectionInfo: info }),

  clearSelection: () =>
    set({
      drawnCoordinates: null,
      drawnGeometryType: null,
      boundingBox: null,
      selectionInfo: null,
      isSidebarOpen: false,
      activeTool: null,
    }),

  // Generation actions
  setPrompt: (prompt) => set({ prompt }),

  setStylePreset: (preset) => set({ stylePreset: preset }),

  startGeneration: (stage = "Enhancing prompt...") =>
    set({ isGenerating: true, generationStage: stage }),

  setGenerationStage: (stage) => set({ generationStage: stage }),

  finishGeneration: () =>
    set({ isGenerating: false, generationStage: "" }),

  addVersion: (version) =>
    set((state) => ({
      generatedVersions: [...state.generatedVersions, version],
      activeVersionIndex: state.generatedVersions.length,
    })),

  setActiveVersionIndex: (index) => set({ activeVersionIndex: index }),

  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),

  // Map control actions
  setBuildingOpacity: (opacity) => set({ buildingOpacity: opacity }),

  // UI actions
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
