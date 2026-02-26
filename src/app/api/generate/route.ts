import { NextRequest, NextResponse } from "next/server";
import { editMapImage } from "@/services/gemini-image";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, mapScreenshot } = body as {
      prompt: string;
      mapScreenshot: string;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 }
      );
    }

    if (!mapScreenshot) {
      return NextResponse.json(
        { error: "Missing required field: mapScreenshot" },
        { status: 400 }
      );
    }

    const { imageDataUri } = await editMapImage({
      prompt,
      imageBase64: mapScreenshot,
    });

    return NextResponse.json({
      imageUrl: imageDataUri,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate visualization",
      },
      { status: 500 }
    );
  }
}
