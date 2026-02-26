import type { StylePreset } from "@/types";

/** Neutral viewpoint prefixes per style — no domain assumptions like "construction site". */
export const VIEWPOINT_PREFIX: Record<StylePreset, string> = {
  "top-down":
    "High-altitude aerial photograph, viewed from directly above.",
  "cross-section":
    "Technical cross-section cutaway diagram showing underground layers,",
  architectural:
    "Photorealistic architectural visualization at eye-level perspective,",
};

/**
 * Build a prompt for image generation using the template.
 * No LLM call — preserves user's exact wording with style prefix.
 * Includes boundary hint so content stays within the selected site.
 */
export function buildPromptForGeneration(
  userPrompt: string,
  stylePreset: StylePreset
): string {
  const prefix = VIEWPOINT_PREFIX[stylePreset];
  const trimmed = userPrompt.trim();
  return `${prefix} ${trimmed}. Confined to the selected site boundary. High resolution, photorealistic.`;
}
