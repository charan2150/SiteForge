export type ActiveTool = "pan" | "polygon" | "line" | null;

export type StylePreset = "top-down" | "cross-section" | "architectural";

export interface GeneratedVersion {
  id: string;
  imageUrl: string;
  prompt: string;
  enhancedPrompt: string;
  stylePreset: StylePreset;
  timestamp: number;
  captureBounds?: BoundingBox;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

export type BoundingBox = [number, number, number, number]; // [west, south, east, north]

export interface MapCenter {
  lng: number;
  lat: number;
}

export interface SavedProject {
  id: string;
  created_at: string;
  coordinates: number[][];
  bounding_box: BoundingBox;
  prompt: string;
  enhanced_prompt: string;
  style_preset: StylePreset;
  image_url: string;
  map_center: MapCenter;
  map_zoom: number;
}

export interface GenerateRequest {
  prompt: string;
  stylePreset: StylePreset;
  aspectRatio: string;
}

export interface GenerateResponse {
  imageUrl: string;
  enhancedPrompt?: string;
}
