import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const IMAGE_MODELS_TO_TRY = [
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-exp-image-generation",
];

interface EditImageInput {
  prompt: string;
  imageBase64: string;
}

/**
 * Send a map screenshot to Gemini along with an editing instruction.
 * Gemini edits the image in-place — replacing the described area while
 * preserving surrounding context (colors, lighting, perspective).
 * Returns a base64 PNG data URI of the result.
 */
export interface EditMapImageResult {
  imageDataUri: string;
  instruction: string;
}

export async function editMapImage({
  prompt,
  imageBase64,
}: EditImageInput): Promise<EditMapImageResult> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const editInstruction =
    `MASKED INPAINTING TASK — you must respect a strict boundary. The red polygon defines the selected site. ALL changes go inside it only.

BOUNDARY: A bright red polygon outline (with light red fill) marks the EXACT area to edit. This is your inpainting mask. The red shape is drawn by the user to select a site on the map.

RULES — follow exactly:
1. EDIT STRICTLY INSIDE the red polygon ONLY. Replace all pixels within the red boundary with new content. Do not extend any generated content beyond the polygon edges. The generated scene must fit entirely within the polygon's footprint. Stay within the selected site.
2. PRESERVE OUTSIDE: Every pixel outside the red polygon must remain IDENTICAL to the input. Do not move, shift, recrop, enhance, or alter roads, buildings, vehicles, labels, or any element outside the mask.
3. REMOVE the red outline and red fill from your output — the final image must have NO red marks. The output should look like a seamless aerial photograph.
4. BLEND at the polygon edge only — a soft seam where the new content meets the unchanged surroundings. No visible hard cutoff.

CONTENT TO GENERATE INSIDE THE RED POLYGON (selected site only):
${prompt}

STYLE: Match the satellite/aerial aesthetic — straight-down orthographic view, same lighting, shadows, and color temperature as the surrounding map. Output same dimensions as input. No cropping.`;

  const mimeType = imageBase64.startsWith("data:image/jpeg")
    ? "image/jpeg"
    : "image/png";

  let lastError: unknown;

  for (const modelId of IMAGE_MODELS_TO_TRY) {
    try {

      const response = await ai.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [
              { text: editInstruction },
              { inlineData: { mimeType, data: base64Data } },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("Gemini returned no candidates");
      }

      const parts = candidates[0].content?.parts;
      if (!parts) {
        throw new Error("Gemini returned no content parts");
      }

      for (const part of parts) {
        if (part.inlineData?.data) {
          const partMime = part.inlineData.mimeType || "image/png";
          return {
            imageDataUri: `data:${partMime};base64,${part.inlineData.data}`,
            instruction: editInstruction,
          };
        }
      }

      const textParts = parts.filter((p) => p.text).map((p) => p.text).join(" ");
      throw new Error(
        `Gemini did not return an image. Response: ${textParts.slice(0, 200)}`
      );
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SiteForge] Model ${modelId} failed:`, msg.slice(0, 150));
      if (msg.includes("404") || msg.includes("not found") || msg.includes("not supported")) {
        continue;
      }
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error(
          "Gemini API quota exceeded. Please check your plan and billing at https://ai.google.dev/gemini-api/docs/rate-limits — the image generation model requires a paid plan or sufficient free tier quota."
        );
      }
      throw err;
    }
  }

  throw lastError;
}
