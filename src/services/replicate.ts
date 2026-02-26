import Replicate from "replicate";

function getReplicateClient() {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env.local and restart the dev server."
    );
  }
  return new Replicate({ auth: token });
}

export type IdeogramAspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3"
  | "16:10"
  | "10:16"
  | "3:1"
  | "1:3";

interface TextToImageInput {
  prompt: string;
  aspectRatio?: IdeogramAspectRatio;
  negativePrompt?: string;
}

export async function runTextToImage({
  prompt,
  aspectRatio = "1:1",
  negativePrompt = "cartoon, illustration, sketch, painting, anime, 3d render, CGI, diagram, text, labels, watermark, logo, blurry, low resolution, abstract, unrealistic",
}: TextToImageInput): Promise<string> {
  const replicate = getReplicateClient();

  console.log("[SiteForge] Ideogram v2-turbo text-to-image");
  console.log("[SiteForge] Aspect ratio:", aspectRatio);
  console.log("[SiteForge] Prompt:", prompt.slice(0, 300));
  console.log("[SiteForge] Negative:", negativePrompt.slice(0, 150));

  const output = await replicate.run("ideogram-ai/ideogram-v2-turbo", {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      negative_prompt: negativePrompt,
      magic_prompt_option: "Off",
      style_type: "Realistic",
    },
  });

  console.log("[SiteForge] Output type:", typeof output);

  if (typeof output === "string") return output;
  if (typeof output === "object" && output !== null) {
    return String(output);
  }

  throw new Error("Unexpected output format from Replicate");
}
