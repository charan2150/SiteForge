import type { StylePreset } from "@/types";

export const DEFAULT_MAP_CENTER: [number, number] = [-73.985, 40.748]; // NYC
export const DEFAULT_MAP_ZOOM = 16;
export const DEFAULT_MAP_PITCH = 0;
export const DEFAULT_MAP_BEARING = 0; // North up

export const MAPBOX_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";

export const STYLE_PRESETS: { value: StylePreset; label: string }[] = [
  { value: "top-down", label: "Top-Down Plan" },
  { value: "cross-section", label: "Geotechnical Cross-Section" },
  { value: "architectural", label: "Architectural Render" },
];

export const GENERATION_TIMEOUT_MS = 120_000;
