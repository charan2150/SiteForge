import { NextRequest, NextResponse } from "next/server";
import {
  enhancePrompt,
  buildFallbackPrompt,
  describeSurroundingsFromImage,
} from "@/services/gemini";
import type { StylePreset } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, stylePreset, locationName, siteArea, contextImage } =
      body as {
        prompt: string;
        stylePreset: StylePreset;
        locationName?: string;
        siteArea?: string;
        contextImage?: string;
      };

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 }
      );
    }

    const preset = stylePreset || "top-down";

    let surroundingContext: string | undefined;
    if (contextImage) {
      try {
        surroundingContext = await describeSurroundingsFromImage(contextImage);
      } catch {
        /* non-critical */
      }
    }

    const promptContext = {
      userPrompt: prompt,
      stylePreset: preset,
      locationName,
      siteArea,
      surroundingContext,
    };

    let enhancedPrompt: string;
    try {
      enhancedPrompt = await enhancePrompt(promptContext);
    } catch {
      enhancedPrompt = buildFallbackPrompt(promptContext);
    }

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error("Enhance error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to enhance prompt",
      },
      { status: 500 }
    );
  }
}
