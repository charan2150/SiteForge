import { GoogleGenerativeAI } from "@google/generative-ai";
import type { StylePreset } from "@/types";
import { VIEWPOINT_PREFIX, buildPromptForGeneration } from "@/lib/prompt-utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
];

interface PromptContext {
  userPrompt: string;
  stylePreset: StylePreset;
  locationName?: string;
  siteArea?: string;
  surroundingContext?: string;
}

const NEGATIVE_PROMPTS: Record<StylePreset, string> = {
  "top-down":
    "side view, ground-level view, eye-level view, cartoon, illustration, sketch, painting, anime, 3d render, CGI, diagram, text, labels, arrows, annotations, watermark, logo, blurry, low resolution, abstract, unrealistic",
  "cross-section":
    "top-down view, aerial view, cartoon, illustration, anime, 3d render, CGI, text, labels, watermark, logo, blurry, low resolution, abstract, unrealistic",
  architectural:
    "top-down view, satellite view, cartoon, illustration, anime, CGI, text, labels, watermark, logo, blurry, low resolution, abstract, unrealistic",
};

export function getNegativePrompt(stylePreset: StylePreset): string {
  return NEGATIVE_PROMPTS[stylePreset];
}

export async function describeSurroundingsFromImage(
  imageDataUrl: string
): Promise<string> {
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
  if (!base64) return "";

  let lastError: unknown;
  for (const modelId of GEMINI_MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent([
        {
          text: `This is a satellite/map screenshot. In ONE short phrase (max 8 words), describe the terrain type (e.g. "urban intersection with crosswalks" or "park with grass and trees"). No place names. Only output that phrase.`,
        },
        {
          inlineData: { mimeType: "image/png", data: base64 },
        },
      ]);
      return result.response.text().trim() || "";
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("429") || msg.includes("quota")) continue;
      throw err;
    }
  }
  throw lastError;
}

export function buildFallbackPrompt({
  userPrompt,
  stylePreset,
}: PromptContext): string {
  return buildPromptForGeneration(userPrompt, stylePreset);
}

export async function enhancePrompt({
  userPrompt,
  stylePreset,
}: PromptContext): Promise<string> {
  const systemPrompt = `You reformat prompts for AI image generation. Do NOT add details the user did not mention.
Do NOT add "construction site", "under construction", or any site-type words the user did not specify.

Always start output with exactly: "${VIEWPOINT_PREFIX[stylePreset]}"

Rewrite the user's description in clear, direct language suitable for an image generator. Keep every element the user mentioned. Do not add new objects, colors, brands, or materials they did not specify. Append: "high resolution, photorealistic"

The output will be placed inside a user-drawn boundary on a map (a single site area). Describe a scene that fits within one bounded site — e.g. one lot, one excavation, one plaza. Avoid descriptions that imply a sprawling or multi-block area.

Output 1-3 sentences. Only output the prompt text, no quotes, no commentary.`;

  const userContent = `User says: "${userPrompt}"`;
  let lastError: unknown;

  for (const modelId of GEMINI_MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userContent },
      ]);
      let enhanced = result.response.text().trim();
      if (!enhanced.toLowerCase().startsWith("high-altitude") && !enhanced.toLowerCase().startsWith("aerial") && stylePreset === "top-down") {
        enhanced = `${VIEWPOINT_PREFIX["top-down"]} ${enhanced}`;
      }
      return enhanced;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("not found") || msg.includes("429") || msg.includes("quota") || msg.includes("limit")) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
